import { Signal, batch, useSignal } from '@preact/signals'
import { useMemo } from 'preact/hooks'
export type Inactive = { state: 'inactive' }
export type Pending = { state: 'pending' }
export type Resolved<T> = { state: 'resolved', value: T }
export type Rejected = { state: 'rejected', error: Error }
export type AsyncProperty<T> = Inactive | Pending | Resolved<T> | Rejected
export type AsyncState<T> = { value: Signal<AsyncProperty<T>>, waitFor: (resolver: () => Promise<T>) => void, reset: () => void }

export function useAsyncState<T>(): AsyncState<T> {
	function getCaptureAndCancelOthers() {
		// delete previously captured signal so any pending async work will no-op when they resolve
		delete captureContainer.peek().result
		// capture the signal in a new object so we can delete it later if it is interrupted
		captureContainer.value = { result }
		return captureContainer.peek()
	}

	async function activate(resolver: () => Promise<T>) {
		const capture = getCaptureAndCancelOthers()
		// we need to read the property out of the capture every time we look at it, in case it is deleted asynchronously
		function setCapturedResult(newResult: AsyncProperty<T>) {
			const result = capture.result
			if (result === undefined) return
			result.value = newResult
		}
		try {
			const pendingState = { state: 'pending' as const }
			setCapturedResult(pendingState)
			const resolvedValue = await resolver()
			const resolvedState = { state: 'resolved' as const, value: resolvedValue }
			setCapturedResult(resolvedState)
		} catch (unknownError: unknown) {
			const error = unknownError instanceof Error ? unknownError : typeof unknownError === 'string' ? new Error(unknownError) : new Error(`Unknown error occurred.\n${JSON.stringify(unknownError)}`)
			const rejectedState = { state: 'rejected' as const, error }
			setCapturedResult(rejectedState)
		}
	}

	function reset() {
		const result = getCaptureAndCancelOthers().result
		if (result === undefined) return
		result.value = { state: 'inactive' }
	}

	const result = useSignal<AsyncProperty<T>>({ state: 'inactive' })
	const captureContainer = useSignal<{ result?: Signal<AsyncProperty<T>> }>({})

	return { value: result, waitFor: resolver => activate(resolver), reset }
}

export class OptionalSignal<T> extends Signal<Signal<T> | undefined> {
	private inner: Signal<T> | undefined

	public constructor(value: Signal<T> | T | undefined, startUndefined?: boolean) {
		if (value === undefined) {
			super(undefined)
		} else if (value instanceof Signal) {
			super(startUndefined ? undefined : value)
			this.inner = value
		} else {
			const inner = new Signal(value)
			super(startUndefined ? undefined : inner)
			this.inner = inner
		}
	}

	public clear() {
		this.value = undefined
	}
	
	public get deepValue() {
		const inner = this.value
		if (inner === undefined) return undefined
		else return inner.value
	}

	public deepPeek() {
		const inner = this.peek()
		if (inner === undefined) return undefined
		else return inner.peek()
	}

	public set deepValue(newValue: T | undefined) {
		if (newValue === undefined) {
			this.value = undefined
		} else {
			batch(() => {
				if (this.inner === undefined) this.inner = new Signal(newValue)
				else this.inner.value = newValue
				this.value = this.inner
			})
		}
	}
}

export function useOptionalSignal<T>(value: Signal<T> | T | undefined, startUndefined?: boolean) {
	return useMemo(() => new OptionalSignal<T>(value, startUndefined), []);
}

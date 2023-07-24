import { batch, Signal, useSignal, useSignalEffect } from "@preact/signals";
import { JSX } from "preact/jsx-runtime";
import { OptionalSignal } from "../library/preact-utilities.js";

export interface BaseInputModel extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'value' | 'onInput' | 'onInput'> {
	readonly rawValue?: Signal<string>
}
export interface UnparsedInputModel extends BaseInputModel {
	readonly value: Signal<string>
	readonly sanitize?: (input: string) => string
	readonly tryParse?: never
	readonly serialize?: never
}
export interface ParsedInputModel<T> extends BaseInputModel {
	readonly value: OptionalSignal<T>
	readonly sanitize: (input: string) => string
	readonly tryParse: (input: string) => { ok: true, value: T | undefined } | { ok: false }
	readonly serialize: (input: T | undefined) => string
}
function ParsedInput<T>(model: ParsedInputModel<T>) {
	const pendingOnChange = useSignal(false)
	const internalValue = model.rawValue || useSignal(model.serialize(model.value.deepPeek()))

	// internalValue changed or signal/hook referenced by sanitize/tryParse changed
	useSignalEffect(() => {
		batch(() => {
			const sanitized = model.sanitize(internalValue.value)
			internalValue.value = sanitized
			const parsed = model.tryParse(sanitized)
			if (!parsed.ok) return
			if (parsed.value !== model.value.deepPeek()) pendingOnChange.value = true
			model.value.deepValue = parsed.value
		})
	})

	// model value changed or signal/hook referenced by sanitize/tryParse/serialize changed
	useSignalEffect(() => {
		batch(() => {
			const parsedInternal = model.tryParse(model.sanitize(internalValue.peek()))
			if (parsedInternal.ok && parsedInternal.value === model.value.deepValue) return
			internalValue.value = model.serialize(model.value.deepValue)
		})
	})

	function onChange(event: JSX.TargetedEvent<HTMLInputElement, Event>) {
		if (!pendingOnChange.peek()) return
		if (!model.onChange) return
		pendingOnChange.value = false
		model.onChange(event)
	}

	// we want to pass through all model values *except* the rawValue, which may contain a password
	const inputModel = { ...model }
	delete inputModel.rawValue
	return <input {...inputModel} value={internalValue} onInput={event => internalValue.value = event.currentTarget.value} onChange={onChange}/>
}
export function Input<T>(model: UnparsedInputModel | ParsedInputModel<T>) {
	if ('tryParse' in model && model.tryParse) {
		return <ParsedInput {...model}/>
	} else {
		return <ParsedInput {...model} value={new OptionalSignal(model.value)} sanitize={model.sanitize || (x => x)} tryParse={value=>({ok: true, value})} serialize={x=>x||''}/>
	}
}

// <>
// 	<Input value={new Signal('')}/>
// 	<Input value={new Signal('')} sanitize={x=>x}/>
// 	<Input value={new Signal('')} sanitize={x=>x} trySerialize={x=>x} tryParse={x=>({result:'success',value:x})}/>
// 	<Input/>
// 	<Input value={new Signal('')} sanitize={x=>x} trySerialize={(x: string)=>x}/>
// 	<Input value={new Signal('')} trySerialize={(x: string)=>x}/>
// </>

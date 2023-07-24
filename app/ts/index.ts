import { Signal } from '@preact/signals'
import { createElement, render } from 'preact'
import { App, AppModel } from './components/App.js'

// create the root model for our app
const greeting = new Signal('Hello')
const rootModel = {
	greeting: greeting,
	cycleGreeting: () => greeting.value = (greeting.peek() === 'Hello') ? 'nuqneH' : 'Hello',
} satisfies AppModel

// put the root model on the window for debugging convenience
declare global { interface Window { rootModel: AppModel } }
window.rootModel = rootModel

// specify our render function, which will be fired anytime rootModel is mutated
function rerender() {
	const element = createElement(App, rootModel)
	render(element, document.body)
}

// kick off the initial render
rerender()

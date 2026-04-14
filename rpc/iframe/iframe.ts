namespace $ {
	export class $mol_rpc_iframe<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
		Handlers extends $mol_rpc_handlers = $mol_rpc_handlers
	> extends $mol_rpc<Remote_handlers, Handlers> {

		target() {
			// for main window - bind window to iframe contentWindow
			return this.$.$mol_dom_context.parent
		}

		override remote_call<Key extends keyof Remote_handlers>(name : Key , arg : Parameters<Remote_handlers[Key]>[0]) {
			const channel = new $mol_rpc_channel<ReturnType<Remote_handlers[Key]>>()
			this.target().postMessage([ name, arg ], '*', [ channel.sender() ])

			return channel
		}

		protected event_receive(e: MessageEvent) {
			if (! Array.isArray(e.data) ) return
			if ( e.data.length !== 2) return

			const [ name, arg ] = e.data
			const sender = e.ports[0]

			if ( ! (sender instanceof MessagePort) ) return

			const response = this.response(name, arg)

			sender.postMessage(response)
		}

		@ $mol_mem
		protected override listener() {
			const target = this.target()
			const cb = $mol_wire_async((e: MessageEvent) => this.event_receive(e))

			target.addEventListener('message', cb)

			return { destructor: () => target.removeEventListener('message', cb) }
		}
	}
}

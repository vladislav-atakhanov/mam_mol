namespace $ {
	export class $mol_rpc_iframe<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
	> extends $mol_rpc<Remote_handlers> {

		frame_window() {
			return this.$.$mol_dom_context.window
		}

		parent_window() {
			return this.$.$mol_dom_context.parent
		}

		@ $mol_mem
		protected override target() {
			// for main window - bind window to iframe contentWindow
			const host = this.parent_window() ?? this.frame_window()

			const cb = (e: MessageEvent) => this.event_receive(e)
			host.addEventListener('message', cb)
			const destructor = () => host.removeEventListener('message', cb)

			return { host, destructor }
		}

		@ $mol_action
		override channel(method : string , args : readonly unknown[]) {
			const channel = new $mol_rpc_channel()
			this.target().host.postMessage([ method, args ], '*', [ channel.sender() ])

			return channel
		}

		event_receive(e: MessageEvent) {
			if (! Array.isArray(e.data) ) return
			if ( e.data.length !== 2) return

			const [ name, args ] = e.data
			const sender = e.ports[0]

			if ( ! (sender instanceof MessagePort) ) return

			this.handle_async([name, args, sender])
		}
	}
}

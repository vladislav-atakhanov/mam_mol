namespace $ {
	export class $mol_rpc_worker<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
		Handlers extends $mol_rpc_handlers = $mol_rpc_handlers
	> extends $mol_rpc<Remote_handlers, Handlers> {

		threads() {
			return $node['node:worker_threads'] as typeof import('node:worker_threads')
		}

		uri() { return '' }

		@ $mol_mem
		target() {
			return this.threads().parentPort ?? new Worker( this.uri() )
		}

		override remote_call<Key extends keyof Remote_handlers>(name : Key , arg : Parameters<Remote_handlers[Key]>[0]) {
			const channel = new $mol_rpc_channel<ReturnType<Remote_handlers[Key]>>()
			const sender = channel.sender()

			this.target().postMessage([ name, arg, sender ], [ sender as any ])

			return channel
		}

		protected event_receive(e: Event & { data?: unknown, port?: MessagePort }) {
			if (! Array.isArray(e.data) ) return
			if ( e.data.length !== 3) return

			const [ name, arg, sender ] = e.data

			if (typeof name !== 'string') return
			if ( ! (sender instanceof MessagePort) ) return

			const response = this.response(name, arg)

			sender.postMessage(response)
		}

		@ $mol_mem
		override listener() {
			const target = this.target()
			const cb = $mol_wire_async((e: Event) => this.event_receive(e))

			target.addEventListener('message', cb)

			return { destructor: () => target.removeEventListener('message', cb) }
		}
	}
}

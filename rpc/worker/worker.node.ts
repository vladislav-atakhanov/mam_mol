namespace $ {
	export class $mol_rpc_worker<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
		Handlers extends $mol_rpc_handlers = $mol_rpc_handlers
	> extends $mol_rpc<Remote_handlers, Handlers> {

		threads() {
			return $node['node:worker_threads'] as typeof import('node:worker_threads')
		}

		uri() { return '' }

		worker() {
			const threads = this.threads()
			return new threads.Worker(this.uri())
		}

		worker_inited() {
			const worker = this.worker()

			return new Promise<typeof worker>((done, fail) => {
				worker.once('error', e => {

					const error = typeof e !== 'object' || ! e
						? 'Unknown'
						: 'error' in e && e.error instanceof Error
							? e.error
							: new $mol_error_mix(('message' in e ? String(e.message) : null) || 'Unknown error', e)

					fail(error)
				})
				worker.once('online', () => done(worker))
				worker.once('exit', code => fail(new Error('Worker exited', { cause: { code } })))
			})
		}

		@ $mol_mem
		target() {
			const parent = this.threads().parentPort
			if ( parent ) return parent

			return $mol_wire_sync(this).worker_inited()
		}

		@ $mol_action
		override remote_call<Method extends keyof Remote_handlers>(method : Method , arg : Parameters<Remote_handlers[Method]>[0]) {
			const channel = new $mol_rpc_channel<ReturnType<Remote_handlers[Method]>>()
			const sender = channel.sender()

			this.target().postMessage([ method, arg, sender ], [ sender as any x])

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
		protected override listener() {
			const target = this.target()
			const cb = $mol_wire_async((e: Event) => this.event_receive(e))

			target.on('message', cb)

			return { destructor: () => {
				target.off('message', cb)
				// terminate worker if target is worker
				;(target as any)[Symbol.asyncDispose]?.()
			} }
		}
	}
}

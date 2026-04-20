namespace $ {
	export class $mol_rpc_worker<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
	> extends $mol_rpc<Remote_handlers> {
		static is_main() {
			return this.threads().isMainThread
		}

		static threads() {
			return $node['node:worker_threads'] as typeof import('node:worker_threads')
		}

		threads() { return this.$.$mol_rpc_worker.threads() }

		uri() { return '' }

		options() {
			return {} as import('node:worker_threads').WorkerOptions
		}

		worker_data() {
			return this.threads().workerData as unknown
		}

		worker() {
			const { Worker } = this.threads()

			let destructing = false

			const destructor = () => {
				if (destructing) return
				destructing = true
				worker.terminate().catch(e => this.$.$mol_fail_log(e))
			}

			const worker = Object.assign(new Worker(this.uri(), this.options()), { destructor })

			let inited = false
			worker.on('message', e => {
				if (destructing) return
				inited = true
				this.event_receive(e)
			})

			return new Promise<typeof worker>((done, reject) => {

				worker.on('error', (e: { code: string, message?: string }) => {
					if (destructing) return
					const err = e instanceof Error
						? e
						: new Error((typeof e === 'object' && e ? e.message : null) || String(e), { cause: e })

					if (! inited) return reject(err)

					this.restarts(null)
					this.error([ err ])
				})

				worker.on('exit', code => {
					if (destructing) return
					if (! inited) return reject(new Error('Worker exited', { cause: { code }}))

					// liveness = reject === null

					this.restarts(null)
				})
	
				worker.on('online', () => done(worker))

			})
		}

		@ $mol_mem
		restarts(next?: null): number {
			return 1 + ($mol_wire_probe(() => this.restarts()) ?? -1)
		}

		@ $mol_mem
		protected override target() {
			this.restarts()
			const parent = this.threads().parentPort
			const worker = parent ? null : $mol_wire_sync(this).worker()

			const cb = (e: Event) => this.event_receive(e)
			parent?.on('message', cb)

			const destructor = () => {
				worker?.destructor()
				parent?.off('message', cb)
			}

			const postMessage = (payload: $mol_rpc_payload) => {
				(parent ?? worker)?.postMessage(payload, [ payload[2] as any ])
			}

			return { postMessage, destructor }
		}

		override toString() {
			return `${this.threads().isMainThread ? 'main' : 'thread'} ${super.toString()}`
		}

		event_receive(data: unknown) {
			if (! Array.isArray(data) ) return
			if ( data.length !== 3) return

			const [ name, args, sender ] = data

			if (typeof name !== 'string') return
			if ( ! (sender instanceof MessagePort) ) return

			this.handle_async([ name, args, sender ])
		}

	}
}

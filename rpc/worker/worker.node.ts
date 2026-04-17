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

		worker() {
			const threads = this.threads()
			const worker = new threads.Worker(this.uri(), this.options())

			worker.on('message', e => this.event_receive(e))

			return new Promise<typeof worker>((done, fail) => {
				worker.on('error', (e: { code: string, message?: string }) => {
					const err = e instanceof Error
						? e
						: new Error((typeof e === 'object' && e ? e.message : null) || String(e), { cause: e })

					fail(err)
					this.error([ err ])
				})

				worker.on('online', () => done(worker))

				worker.on('exit', code => {
					if (code === 0) return
					//schedule restart if not terminated normally
					new $mol_after_timeout(this.restart_delay(), () => this.restarts(null))
				})

			})
		}

		@ $mol_mem
		error(next?: [ Error ]) {
			if (next) this.$.$mol_fail_log(next[0])
			return next ?? []
		}

		restart_delay() {
			return 1000
		}

		@ $mol_mem
		restarts(next?: null): number {
			return 1 + ($mol_wire_probe(() => this.restarts()) ?? -1)
		}

		@ $mol_mem
		protected override target() {
			this.restarts()
			const parent = this.threads().parentPort

			if ( ! parent ) {
				const worker = $mol_wire_sync(this).worker()
				this.$.$mol_log3_rise({
					place: `${this}.target`,
					message: 'started',
				})

				const destructor = () => { worker.terminate().catch(e => this.$.$mol_fail_log(e)) }

				return { host: worker, destructor }
			}

			const cb = (e: Event) => this.event_receive(e)
			parent.on('message', cb)

			const destructor = () => { parent.off('message', cb) }

			this.$.$mol_log3_rise({
				place: `${this}.target`,
				message: 'attached',
			})

			return { host: parent, destructor }
		}

		@ $mol_action
		override channel(method : string , args : readonly unknown[]) {
			const channel = new $mol_rpc_channel()
			const sender = channel.sender()

			this.$.$mol_log3_rise({
				place: `${this}.send`,
				message: 'sended',
				method,
			})

			this.target().host?.postMessage([ method, args, sender ], [ sender as any ])

			return channel
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

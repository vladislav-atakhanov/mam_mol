namespace $ {

	export type $mol_rpc_handlers = Record<string, Function>

	export type $mol_rpc_methods<Obj extends {}> = {
		[Key in keyof Obj]: Obj[Key] extends Function ? Obj[Key] : never
	}

	export type $mol_rpc_payload = [name : string , args : readonly unknown[], sender: MessagePort]

	export class $mol_rpc<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
	> extends $mol_object {

		handlers() {
			return {} as Record<string, Function>
		}

		handle_async(payload: $mol_rpc_payload) {
			return $mol_wire_async(this).handle(payload)
		}

		handle([ name, args, sender ]: $mol_rpc_payload) {
			let result, error

			try {
				result = this.handlers()[name](...args)
			} catch (e) {
				if ($mol_promise_like(e)) $mol_fail_hidden(e)
				this.$.$mol_fail_log(e)
				error = { message: (e as Error).message, name, args, cause: (e as Error).cause }
			}

			sender.postMessage({ result , error })
		}

		@ $mol_mem
		protected target() {
			return {
				postMessage(payload: $mol_rpc_payload) {}
			}
		}

		@ $mol_action
		channel(method : string , args : readonly unknown[]) {
			const channel = new $mol_rpc_channel()
			this.target().postMessage([method, args, channel.sender()])
			return channel
		}

		@ $mol_mem
		remote() {
			return new Proxy( {} , {
				get : ( target : any , name : string ) =>
					( ... args : readonly unknown[] ) => name === 'destructor'
						? null
						: this.channel(name, args).result()
			} ) as Remote_handlers
		}

		@ $mol_mem
		error(next?: [ Error ]) {
			if (next) this.$.$mol_fail_log(next[0])
			return next ?? []
		}

		@ $mol_mem
		status() {
			this.target()
			const error = this.error()[0]
			if (error) $mol_fail_hidden(error)
			return null
		}

	}

}

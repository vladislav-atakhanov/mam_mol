namespace $ {

	export type $mol_rpc_handlers = Record<string, Function>

	export type $mol_rpc_methods<Obj extends {}> = {
		[Key in keyof Obj]: Obj[Key] extends Function ? Obj[Key] : never
	}

	type Payload = [name : string , args : readonly unknown[], sender: MessagePort]

	export class $mol_rpc<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
	> extends $mol_object {

		handlers() {
			return {} as Record<string, Function>
		}

		handle_async(payload: Payload) {
			return $mol_wire_async(this).handle(payload)
		}

		handle([ name, args, sender ]: Payload) {
			let result, error

			try {
				result = this.handlers()[name](...args)
			} catch (e) {
				if ($mol_promise_like(e)) $mol_fail_hidden(e)
				this.$.$mol_fail_log(e)
				error = { message: (e as Error).message, name, args, cause: (e as Error).cause }
			}

			this.$.$mol_log3_rise({
				place: `${this}.handle()`,
				message: name,
				result,
				error,
			})

			sender.postMessage({ result , error })
		}

		@ $mol_action
		channel(method : string , args : readonly unknown[]) {
			return new $mol_rpc_channel()
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

		protected target() {}

		@ $mol_mem
		status() {
			this.target()
			return null
		}

	}

}

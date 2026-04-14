namespace $ {

	export type $mol_rpc_handlers = Record<string, (arg: unknown) => unknown>

	export class $mol_rpc<
		Remote_handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
		Handlers extends $mol_rpc_handlers = $mol_rpc_handlers,
	> extends $mol_object {

		remote_call<Method extends keyof Remote_handlers>(method : Method , arg : Parameters<Remote_handlers[Method]>[0]) {
			return new $mol_rpc_channel()
		}

		handlers() {
			return {} as Handlers
		}

		response<Method extends keyof Handlers>(method : Method , arg : Parameters<Handlers[Method]>[0]) {
			let error, result

			try {
				const handlers = this.handlers()
				result = handlers[method](arg)
			} catch (e) {
				if ($mol_promise_like(e) ) $mol_fail_hidden(e)

				const enriched = new $mol_error_mix((e as Error).message, { orig: e, method, arg }, e as Error)
				$mol_fail_log(enriched)
				error = { method, arg, message: enriched.message, cause: enriched.cause }
			}

			return { error, result }
		}

		@ $mol_mem
		remote() {
			return new Proxy( {} as Remote_handlers , {
				get : ( target : any , name : string )=> {
					if (name === 'destructor') return () => {}
					return ( ... args : readonly unknown[] )=> this.remote_call(name, args as any).result()
				}
			} )
		}

		@ $mol_mem
		listener() {
			return { destructor: () => {} }
		}

	}

}

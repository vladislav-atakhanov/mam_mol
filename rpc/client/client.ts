namespace $ {

	export class $mol_rpc_client extends $mol_object {

		post(data: unknown, port: MessagePort) {
		}

		send(data: unknown) {
			const channel = new MessageChannel()
			this.post(data, channel.port2)

			return new Promise<unknown>((done, fail) => {
				channel.port2.onmessage = e => done(e.data)
				channel.port2.onmessageerror = error_event => fail(
					new Error('Message error', { cause: {
						error_event
					} } )
				)
			})
		}

		call( params : { name : string , args : unknown[] } ) {
			return $mol_wire_sync(this).send(params)
		}

		@ $mol_mem
		proxy() {
			return new Proxy( {} , {
				get : ( target : any , name : string )=> {
					return ( ... args : any[] )=> this.call({ name , args })
				}
			} )
		}

	}

}

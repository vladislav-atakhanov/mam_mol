namespace $ {

	export class $mol_rpc_client_frame extends $mol_rpc_client {

		@ $mol_mem_key
		static item( uri : string ) {
			return this.make({ uri : $mol_const( uri ) })
		}

		uri() {
			return ''
		}

		@ $mol_mem
		frame() {
			return this.$.$mol_frame.make({
				uri: () => this.uri(),
			})
		}

		override post(data: unknown, port: MessagePort) {
			this.frame().native().contentWindow!.postMessage(data, '*', [ port ])
		}

	}

}

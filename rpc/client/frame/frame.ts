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

		protected window() {
			const frame = this.frame()
			const iframe = frame.dom_node_actual() as HTMLIFrameElement
			$mol_wire_sync(this.$.$mol_dom_context.document).appendChild(iframe)

			return frame.window()
		}

		override call( params : { name : string , args : unknown[] } ) {
			this.window()
			return super.call(params)
		}

		override post(data: unknown, port: MessagePort) {
			this.window().postMessage(data, '*', [ port ])
		}

	}

}

namespace $ {
	export class $mol_rpc_channel<Result = unknown> extends $mol_object {
		readonly native = new MessageChannel()

		receiver() { return this.native.port1 }
		sender() { return this.native.port2 }

		result_async() {
			const receiver = this.receiver()

			return new Promise<Result>((done, fail) => {
				receiver.onmessage = e => ! e.data || e.data.error
					? fail(new Error(e.data?.error.message || 'Data error', { cause: e.data?.error }))
					: done(e.data.result)

				receiver.onmessageerror = event => fail(
					new Error('Message error', { cause: event } )
				)
			})
		}

		result() {
			return $mol_wire_sync(this).result_async()
		}

	}
}

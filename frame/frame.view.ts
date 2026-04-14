namespace $.$$ {

	/**
	 * @see https://mol.hyoo.ru/#!section=demos/demo=mol_frame_demo
	 */
	export class $mol_frame extends $.$mol_frame {
		
		native_async() {
			const frame = this.dom_node() as HTMLIFrameElement
			this.$.$mol_dom_context.document.documentElement.appendChild(frame)

			return new Promise<typeof frame>((done, fail) => {

				frame.onload = () => done(frame)

				frame.onerror = (event, source, lineno, colno, error) => {
					let err = typeof event === 'string'
						? new Error(event)
						: ( event as ErrorEvent ).error as (Error | undefined)

					if ( ! ( err instanceof Error ) ) err = new Error(error?.message ?? 'Load error', { cause: {
						event,
						source,
						lineno,
						colno,
						error,
					}})

					fail(err)
				}

			})
		}

		@ $mol_mem
		native() {
			$mol_wire_solid()
			return $mol_wire_sync(this).native_async()
		}

		window() {
			// if( this.html() ) return ( this.dom_node() as HTMLIFrameElement ).contentWindow!
			return super.window()
		}

		allow() {
			return [
				... this.fullscreen() ? [ 'fullscreen' ] : [] ,
				... this.accelerometer() ? [ 'accelerometer' ] : [] ,
				... this.autoplay() ? [ 'autoplay' ] : [] ,
				... this.encription() ? [ 'encrypted-media' ] : [] ,
				... this.gyroscope() ? [ 'gyroscope' ] : [] ,
				... this.pip() ? [ 'picture-in-picture' ] : [] ,
				... this.clipboard_read() ? [ `clipboard-read ${ this.uri() }` ] : [],
				... this.clipboard_write() ? [ `clipboard-write ${ this.uri() }` ] : [],
			].join('; ')
		}
		
	}
}

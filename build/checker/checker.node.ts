namespace $ {

	export type $mol_build_checker_remote = {
		error(rec: [filename: string, error: string][]): void
		write(rec: [path: string, data: string][]): void
	}

	export type $mol_build_checker_worker_data = {
		paths: readonly string[]
		root: string
		options: ReturnType<typeof $node.typescript.getDefaultCompilerOptions>
	}

	export class $mol_build_checker extends $mol_object {
		@ $mol_mem
		paths(next?: readonly string[]): readonly string[] {
			return next ?? this.worker_data().paths ?? []
		}

		@ $mol_mem
		root(next?: string): string {
			return next ?? this.worker_data().root ?? ''
		}

		@ $mol_mem
		options(next?: ReturnType<typeof $node.typescript.getDefaultCompilerOptions>) {
			return next ?? this.worker_data().options ?? $node.typescript.getDefaultCompilerOptions()
		}

		@ $mol_mem
		protected rpc() {
			return this.$.$mol_rpc_worker.make<typeof $mol_rpc_worker<$mol_build_checker_remote>>({
				handlers: () => this as $mol_rpc_methods<this>,
			})
		}

		protected worker_data() { return this.rpc().worker_data() as Partial<$mol_build_checker_worker_data> }

		protected remote() { return this.rpc().remote() }

		start() {
			try {
				this.remote()
				this.host()
			} catch(error) {
				if ($mol_promise_like(error)) $mol_fail_hidden(error)
				this.$.$mol_fail_log(error)
				process.exit(1)
			}
		}

		protected run() {}

		protected versions = {} as Record<string, number>
		protected watchers = new Map< string , ( path : string , kind : number )=> void >()

		protected writes = [] as [path: string, data: string][]

		@ $mol_action
		writes_cut() {
			const writes = this.writes
			this.writes = []
			return writes
		}

		write_flush() {
			const writes = this.writes_cut()
			if (! writes.length) return
			$mol_error_fence(() => this.remote().write(writes), e => ($mol_fail_log(e), null))
		}

		write_add(path: string, data: string) {
			if (! this.writes.length) new $mol_after_tick(() => $mol_wire_async(this).write_flush())
			this.writes.push([ path, data ])
		}

		protected errors = [] as [filename: string, error: string][]

		@ $mol_action
		errors_cut() {
			const errors = this.errors
			this.errors = []
			return errors
		}

		errors_flush() {
			const errors = this.errors_cut()
			if (! errors.length) return
			$mol_error_fence(() => this.remote().error(errors), e => ($mol_fail_log(e), null))
		}

		protected error_add(filename: string, error: string) {
			if (! this.errors.length) new $mol_after_tick(() => $mol_wire_async(this).errors_flush())
			this.errors.push([filename, error])
		}

		@ $mol_action
		protected recheck_internal() {
			const paths = this.paths()
			if (! paths.length) return null

			for( const path of paths ) {
				const version = $node.fs.statSync( path ).mtime.valueOf()
				if( this.versions[ path ] && this.versions[ path ] !== version ) {
					const watcher = this.watchers.get( path )
					if( watcher ) watcher( path , 2 )
				}
				this.versions[ path ] = version
			}
			this.run()
		}

		recheck() {
			this.host()
			this.recheck_internal()
			this.errors_flush()
			this.write_flush()
			return null
		}

		@ $mol_mem
		protected host() {
			const paths = this.paths()
			if (! paths.length) return null
			const options = this.options()
			const root = this.root()

			const host = $node.typescript.createWatchCompilerHost(

				paths  as string[],
				
				{
					... options,
					emitDeclarationOnly : true,
				},
				
				{
					... $node.typescript.sys ,
					watchDirectory: ( path, cb ) => {
						// console.log('watchDirectory', path )
						this.watchers.set( path , cb )
						return { close(){} }
					},
					writeFile : (path , data )=> {
						this.write_add(path, data)
					},
					setTimeout : ( cb : any )=> {
						this.run = cb
					} ,
					watchFile : (path:string, cb:(path:string,kind:number)=>any )=> {
						// console.log('watchFile', path )
						this.watchers.set( path , cb )
						return { close(){ } }
					},
				},
				
				$node.typescript.createEmitAndSemanticDiagnosticsBuilderProgram,

				( diagnostic )=> {

					if( diagnostic.file ) {

						const error = $node.typescript.formatDiagnostic( diagnostic , {
							getCurrentDirectory : ()=> root ,
							getCanonicalFileName : ( path : string )=> path.toLowerCase() ,
							getNewLine : ()=> '\n' ,
						})
						const name = diagnostic.file.getSourceFile().fileName

						this.error_add( name , error )
						
					} else {
						const text = diagnostic.messageText
						this.$.$mol_log3_fail({
							place : `${this}.host()` ,
							message: typeof text === 'string' ? text : text.messageText ,
						})
					}
					
				} ,

				()=> {}, //watch reports
				
				[], // project refs
				
				{ // watch options
					synchronousWatchDirectory: true,
					watchFile: 5,
					watchDirectory: 0,
				},
				
			)

			const service = $node.typescript.createWatchProgram( host )

			return {
				destructor : ()=> service.close()
			}
		}

	}

}

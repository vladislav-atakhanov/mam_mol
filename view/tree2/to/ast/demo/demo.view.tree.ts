namespace $.$$ {
	export class $mol_view_tree2_to_ast_demo extends $.$mol_view_tree2_to_ast_demo {
		@$mol_mem
		src(next?: string) {
			return this.$.$mol_state_local.value('src', next) ?? super.src()
		}
		@$mol_mem
		comments(next?: boolean) {
			return this.$.$mol_state_local.value('comments', next) ?? super.comments()
		}
		@$mol_mem
		value() {
			return this.src()
		}
		@$mol_mem
		ast() {
			const tree = this.$.$mol_tree2_from_string(this.value())
			const ast = new this.$.$mol_view_tree2_to_ast(tree)
			return ast
		}
		@$mol_mem
		tree() {
			return this.ast().json()
		}
		@$mol_mem
		ast_text() {
			return JSON.stringify(this.$.$mol_tree2_to_json(this.tree()), null, '\t')
		}
		@$mol_mem
		raw_js() {
			const tree = this.$.$mol_tree2_from_string(this.value())
			const js = this.$.$mol_view_tree2_to_js(tree)
			// return this.$.$mol_tree2_to_string(js)
			const text = this.$.$mol_tree2_js_to_text(js)
			return this.$.$mol_tree2_text_to_string(text)
		}
		@$mol_mem
		js() {
			const js = ast_to_js.call(this.$, this.ast())
			// return this.$.$mol_tree2_to_string(js)
			return this.$.$mol_tree2_text_to_string(this.$.$mol_tree2_js_to_text(js))
		}
	}

	function ast_to_js(this: $, ast: $mol_view_tree2_to_ast) {
		const addons = [] as $mol_tree2[]
		return ast.list([
			ast.struct(';', [
				...ast.classes.map(klass => {
					const parent = klass.extends_
					return klass.struct('=', [
						klass.struct('()', [klass.struct('$'), klass.struct('[]', [klass.data(klass.type)])]),
						klass.struct('class', [
							klass.struct(klass.type),
							parent.struct('extends', [
								parent.struct('()', [
									parent.struct('$'),
									parent.struct('[]', [parent.data(parent.type)]),
								]),
							]),
							klass.struct(
								'{}',
								klass.properties.map((prop, name) => {
									if (prop.key.val || prop.writable.val) {
										addons.push(
											name.struct('()', [
												prop.key.struct(prop.key.val ? '$mol_mem_key' : '$mol_mem'),
												name.struct('(,)', [
													name.struct('()', [
														klass.struct('$'),
														name.struct('[]', [klass.data(klass.type)]),
														name.struct('[]', [name.data('prototype')]),
													]),
													name.data(name.value),
												]),
											]),
										)
									}
									return name.struct('.', [
										name.data(name.value),
										name.struct('(,)'),
										name.struct('{;}', [name.struct('return')]),
									])
								}),
							),
						]),
					])
				}),
				...addons,
			]),
		])
	}
}

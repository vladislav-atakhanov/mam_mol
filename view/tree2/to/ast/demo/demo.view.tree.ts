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
			const ast = this.$.$mol_view_tree2_to_ast(tree)
			return ast
		}
		@$mol_mem
		tree() {
			return this.ast().toTree()
		}
		@$mol_mem
		ast_text() {
			return JSON.stringify(this.$.$mol_tree2_to_json(this.tree()), null, '\t')
		}
		@$mol_mem
		raw_js() {
			const tree = this.$.$mol_tree2_from_string(this.value())
			const js = this.$.$mol_view_tree2_to_text(tree)
			return this.$.$mol_tree2_text_to_string(js)
		}
		@$mol_mem
		js() {
			return this.$.$mol_tree2_to_string(this.tree())
		}
	}
}

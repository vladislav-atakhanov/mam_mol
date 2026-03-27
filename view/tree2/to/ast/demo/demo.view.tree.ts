namespace $.$$ {
	export class $mol_view_tree2_to_ast_demo extends $.$mol_view_tree2_to_ast_demo {
		@$mol_mem
		content() {
			const tree = this.$.$mol_tree2_from_string(this.src())
			const ast = this.$.$mol_view_tree2_to_ast(tree)
			return this.$.$mol_tree2_to_string(ast)
		}
		@$mol_mem
		js() {
			const tree = this.$.$mol_tree2_from_string(this.src())
			const text = this.$.$mol_view_tree2_to_text(tree)
			const str = this.$.$mol_tree2_text_to_string(text)
			return str
		}
	}
}

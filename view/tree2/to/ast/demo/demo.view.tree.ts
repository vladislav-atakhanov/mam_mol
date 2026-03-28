namespace $.$$ {
	export class $mol_view_tree2_to_ast_demo extends $.$mol_view_tree2_to_ast_demo {
		@$mol_mem
		value() {
			return this.src()
		}
		@$mol_mem
		content() {
			const pipe = [this.$.$mol_tree2_from_string, this.$.$mol_view_tree2_to_ast, this.$.$mol_tree2_to_string]
			let state = this.value()
			for (const f of pipe) {
				state = f.call(this.$, state)
			}
			return state
		}
		@$mol_mem
		js() {
			const tree = this.$.$mol_tree2_from_string(this.value())
			const text = this.$.$mol_view_tree2_to_text(tree)
			const str = this.$.$mol_tree2_text_to_string(text)
			return str
		}
	}
}

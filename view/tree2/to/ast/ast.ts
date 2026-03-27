namespace $ {
	const err = $mol_view_tree2_error_str

	const { begin, end, latin_only, or, optional, repeat_greedy } = $mol_regexp

	const prop_signature = $mol_regexp.from([
		begin,
		{ name: repeat_greedy(latin_only, 1) },
		{ key: optional(['*', repeat_greedy(latin_only, 0)]) },
		end,
	])

	export function $mol_view_tree2_to_ast(this: $, tree: $mol_tree2) {
		const descr = this.$mol_view_tree2_classes(tree)

		const classes = descr.kids.map(klass => {
			const parent = this.$mol_view_tree2_child(klass)
			const props = this.$mol_view_tree2_class_props(klass)
			return klass.struct(klass.type, [
				klass.struct('*', [
					klass.struct('type', [parent.data(parent.type)]),
					klass.struct('properties', [
						klass.struct(
							'*',
							props.map(prop => {
								const { name = '', key = '' } = [...prop.type.matchAll(prop_signature)][0]?.groups ?? {}
								const keywords = {
									null: 'null',
									false: 'false',
									true: 'true',
									Infinity: 'Infinity',
									'-Infinity': '-Infinity',
								}
								const operators = ['=', '-', '<=>', '<=', '=>', '']
								const val = prop.hack({
									...Object.fromEntries(
										operators.map(o => [o, val => [val.struct(`"${o}"`, [val])]]),
									),
									...Object.fromEntries(
										Object.entries(keywords).map(([k, l]) => [
											k,
											v => [v.struct(`keyword`, [v.data(l)])],
										]),
									),
								})

								return prop.struct(name, [
									prop.struct('*', [
										...(key
											? [
													prop.struct('key', [
														key.length === 1
															? prop.struct('true', [])
															: prop.data(key.slice(1)),
													]),
												]
											: []),
										...val,
									]),
								])
							}),
						),
					]),
				]),
			])
		})

		return descr.struct('/', classes)
	}
}

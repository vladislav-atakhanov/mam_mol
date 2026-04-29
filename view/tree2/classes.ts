namespace $ {
	const err = $mol_view_tree2_error_str
	const is_writable = (input: $mol_tree2) => input.type.includes('?')
	function ensure_writable(input?: $mol_tree2) {
		if (input && !is_writable(input)) return $mol_fail(err`Expected writable at ${input.span}`)
	}
	function ensure_readonly(input?: $mol_tree2) {
		if (input && is_writable(input)) return $mol_fail(err`Expected readonly at ${input.span}`)
	}
	export function $mol_view_tree2_classes(defs: $mol_tree2) {
		return defs.clone(
			defs.hack({
				'-': () => [],
				'': (input, belt) => {
					const kid = input.kids[0]
					switch (kid?.type) {
						case '<=>':
							ensure_writable(input)
							ensure_writable(kid.kids[0])
							break
						case '=>':
							;(is_writable(input) ? ensure_writable : ensure_readonly)(kid.kids[0])
							break
						case '<=':
							ensure_readonly(input)
							break
					}
					return [input.clone(input.hack(belt))]
				},
			}),
		)
	}
}

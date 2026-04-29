namespace $ {
	const err = $mol_view_tree2_error_str
	export function $mol_view_tree2_classes(defs: $mol_tree2) {
		return defs.clone(
			defs.hack({
				'-': () => [],
				'': (input, belt) => {
					deprecated(input)
					bindings(input)
					return [input.clone(input.hack(belt))]
				},
			}),
		)
	}

	function deprecated(input: $mol_tree2) {
		const writable = input.type.indexOf('?')
		const param = input.type.indexOf('!')
		let normalized = input.type
		if (writable !== -1) normalized = normalized.substring(0, writable + 1)
		if (param !== -1) normalized = `${normalized.substring(0, param)}*${writable === -1 ? '' : '?'}`
		if (normalized !== input.type) console.warn(`Syntax ${input.type} is deprecated. Use ${normalized} instead`)
	}

	const is_writable = (input: $mol_tree2) => input.type.includes('?')
	function ensure_writable(input?: $mol_tree2) {
		if (input && !is_writable(input)) return $mol_fail(err`Expected writable at ${input.span}`)
	}
	function ensure_readonly(input?: $mol_tree2) {
		if (input && is_writable(input)) return $mol_fail(err`Expected readonly at ${input.span}`)
	}
	function bindings(input: $mol_tree2) {
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
	}
}

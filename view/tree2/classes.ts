namespace $ {
	const to_writable = (i: $mol_tree2, kids?: readonly $mol_tree2[]) =>
		i.type.includes('?') ? i.clone(kids ?? i.kids) : i.struct(i.type + '?', kids ?? i.kids)

	const bidi = (left: $mol_tree2, right: $mol_tree2) =>
		to_writable(left, [(left.kids[0] ?? left).struct('<=>', [to_writable(right)])])

	export function $mol_view_tree2_classes(defs: $mol_tree2) {
		return defs.clone(
			defs.hack({
				'-': () => [],
				'': (input, belt, context) => {
					const kid = input.kids[0]
					switch (kid?.type) {
						case '<=>':
							return [bidi(input, kid.hack(belt)[0])]
						case '=>': {
							const index = input.type.indexOf('?')
							if (index !== -1) {
								if (kid.kids[0]?.type?.includes('?')) return [bidi(input, kid.hack(belt)[0])]
								else return [input.struct(input.type.substring(0, index), input.hack(belt))]
							}
						}
					}
					return [input.clone(input.hack(belt))]
				},
			}),
		)
	}
}

namespace $.$$ {
	export class $mol_view_tree2_to_ast_demo extends $.$mol_view_tree2_to_ast_demo {
		@$mol_mem
		src(next?: string) {
			return this.$.$mol_state_local.value('src', next) ?? super.src()
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
		ast_text() {
			return JSON.stringify(this.ast(), null, 4)
		}
		@$mol_mem
		raw_js() {
			const tree = this.$.$mol_tree2_from_string(this.value())
			const js = this.$.$mol_view_tree2_to_text(tree)
			return this.$.$mol_tree2_text_to_string(js)
		}
		@$mol_mem
		js() {
			return ast_to_js.call(this.$, this.ast(), this.jsDoc())
		}
	}
	type Properties = $mol_view_tree2_ast['class']['properties']
	const body = (name: string, prop: Properties[keyof Properties], jsDoc: boolean) => {
		switch (prop.type) {
			case 'literal':
				return [`return ${prop.writable ? 'next ?? ' : ''}${JSON.stringify(prop.raw)}`]
			case 'class':
				const obj = 'obj'
				return [
					`const ${obj} = new this.$.${prop.extends}()`,
					...Object.entries(prop.properties).flatMap(([p, value]) => {
						const f = (): never => $mol_fail(new Error())
						switch (value.type) {
							case 'class':
								return f()
							case 'bidi':
								const need_value_id = value.key || value.parent_key
								return [
									[
										...(jsDoc
											? [
													`/* ${name}.${p}${value.parent_key ? '*' : ''}`,
													`<=> ${value.property}${need_value_id ? '*' : ''} */`,
												]
											: []),
										`${obj}.${p} =`,
										`(${value.parent_key ? 'id, ' : ''}next)`,
										`=> this.${value.property}(${need_value_id ? 'id, ' : ''}next)`,
									].join(' '),
								]
							case 'put':
								return [
									...(jsDoc
										? [`/* ${name}.${p}`, `<= ${value.property}${value.key ? '*' : ''} */`]
										: []),
									`${obj}.${p} = () => this.${value.property}(${value.key ? 'id, ' : ''})`,
								].join(' ')
							case 'pull':
							case 'literal':
							case 'i18n':
							case 'dictionary':
							case 'list':
						}
						return [`${obj}.${p} = () => ${JSON.stringify(prop)}`]
					}),
					`return ${obj}`,
				]
			case 'pull':
			case 'put':
			case 'bidi':
			case 'i18n':
			case 'dictionary':
			case 'list':
		}
		return []
	}
	const to_hint = (prop: Properties[keyof Properties], [first, ...other]: string[]) => {
		const val = [first, ...other.map(o => `["${o}"]`)].join('')
		if (prop.type === 'list') return `${val}[]`
		if (prop.type === 'dictionary') return `Record<string, ${val}>`
		if (prop.type === 'literal') {
			if (prop.raw === null) return `${val} | null`
			return typeof prop.raw
		}
		return val
	}
	function ast_to_js(this: $, ast: $mol_view_tree2_ast, jsDoc: boolean) {
		const lines = Object.entries(ast).flatMap(([k, klass]) => {
			return [
				`$.${k} = class ${k} extends $.${klass.extends} {`,
				...Object.entries(klass.properties)
					.flatMap(([p, prop]) => {
						const { hint, key, writable } = prop as typeof prop & { hint?: string[] }
						const args = [
							key && ['id'],
							writable && ['next', (hint ? `{${to_hint(prop, hint)}} ` : '') + '[next]'],
						].filter(Boolean) as [name: string, type?: string][]

						return [
							...(jsDoc && (args.length > 0 || hint)
								? [
										'/**',
										...args.map(([n, t]) => ` * @param ${t ?? '{any} ' + n}`),
										...(hint ? [` * @returns {${to_hint(prop, hint)}}`] : []),
										' */',
									]
								: []),
							`${p}(${args.map(([n]) => n).join(', ')}) {`,
							...body(p, prop, jsDoc).map(l => '\t' + l),
							'}',
						]
					})
					.map(l => '\t' + l),
				`}`,
				...Object.entries(klass.properties)
					.filter(([_, { key, type, writable }]) => key || writable || type === 'class')
					.map(([p]) => '$' + `mol_mem($.${k}.prototype, "${p}")`),
			]
		})
		return lines.join('\n')
	}
}

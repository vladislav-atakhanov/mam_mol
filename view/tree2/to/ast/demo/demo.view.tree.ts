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
			return ast_to_js.call(this.$, this.ast(), this.comments())
		}
	}
	const NEXT = 'next'
	const fail = (...args: unknown[]): never => $mol_fail(new Error(args.map(a => `${a}`).join('\n')))
	type Properties = $mol_view_tree2_ast['class']['properties']
	type Property = Properties[keyof Properties]
	const Key = ({ key }: Pick<Property, 'key'>) => {
		if (!key) return ''
		if (typeof key === 'string') return `"${key}"`
		return 'id'
	}
	const Value = (prop: Property) => {
		switch (prop.type) {
			case 'const':
				return prop.raw
			case 'literal':
				return JSON.stringify(prop.raw)
			case 'put':
				return `this.${prop.property}(${Key(prop)})`
			case 'bidi':
				const k = Key(prop)
				return `this.${prop.property}(${k ? k + ', ' : ''}${NEXT})`
			case 'i18n':
				return 'this.$.$' + `mol_locale.text("${prop.id}")`
		}
		return JSON.stringify(prop)
	}
	const body = (name: string, prop: Property, comments: boolean) => {
		switch (prop.type) {
			case 'const':
			case 'literal':
			case 'i18n':
				const val = Value(prop)
				return prop.writable ? [`return ${NEXT} !== undefined ? ${NEXT} : ${val}`] : [`return ${val}`]
			case 'class':
				const obj = 'obj'
				return [
					`const ${obj} = new this.$.${prop.extends}()`,
					...Object.entries(prop.properties).flatMap(([i, inner]) => {
						switch (inner.type) {
							case 'class':
								return fail()
							case 'bidi':
								return [
									[
										...(comments
											? [
													`/* ${name}.${i}${inner.parent_key ? '*' : ''}`,
													`<=> ${inner.property}${inner.key ? '*' + (inner.key === true ? '' : inner.key) : ''} */`,
												]
											: []),
										`${obj}.${i} =`,
										`(${inner.parent_key ? 'id, ' : ''}${NEXT})`,
										`=> ${Value(inner)}`,
									].join(' '),
								]
							case 'put':
								return [
									...(comments
										? [`/* ${name}.${i}`, `<= ${inner.property}${inner.key ? '*' : ''} */`]
										: []),
									`${obj}.${i} = () => ${Value({
										type: 'put',
										property: inner.property,
										key: inner.key,
									})}`,
								].join(' ')
						}
						return [`${obj}.${i} = () => ${Value(prop)}`]
					}),
					`return ${obj}`,
				]
			case 'dictionary':
				return prop.properties.length < 1
					? ['return {}']
					: [
							'return {',
							...prop.properties
								.map(v => {
									if ('extend' in v) {
										if (!v.extend) return `...super.${name}()`
										return `...${Value({
											type: 'put',
											property: v.extend,
											key: v.key,
										})}`
									}
									const [field, r] = v
									return `${JSON.stringify(field)}: ${Value(r)}`
								})
								.map((l, i, a) => `\t${l}${i + 1 < a.length ? ',' : ''}`),
							'}',
						]
			case 'list':
				return prop.items.length < 1
					? ['return []']
					: [
							'return [',
							...prop.items
								.map(v => {
									if ('extend' in v === false) return Value(v)
									if (!v.extend) return `...super.${name}()`
									return `...${Value({
										type: 'put',
										property: v.extend,
										key: v.key,
									})}`
								})
								.map((l, i, a) => `\t${l}${i + 1 < a.length ? ',' : ''}`),
							']',
						]
			case 'put':
			case 'bidi':
				return [`return ${Value(prop)}`]
			case 'pull':
				return [`return this.${prop.path.map(p => `${p}()`).join('.')}`]
		}
		return fail(prop satisfies never)
	}
	function ast_to_js(this: $, ast: $mol_view_tree2_ast, comments: boolean) {
		const lines = Object.entries(ast).flatMap(([k, klass]) => {
			const to_hint = (p: string, prop: Property): string => {
				const unknown = 'unknown'
				const hint = ({ hint }: { hint?: string[] }) => {
					if (!hint) return unknown
					const [first, ...other] = hint
					if (other.length === 0) return first
					return 'ReturnType<' + [first, ...other.map(o => `["${o}"]`)].join('') + '>'
				}
				switch (prop.type) {
					case 'literal':
						if (prop.raw === null) return hint(prop)
						return typeof prop.raw
					case 'list':
						return `${hint(prop)}[]`
					case 'dictionary':
						return `Record<string, ${hint(prop)}>`
					case 'bidi':
					case 'put':
						if (p === prop.property) return unknown
						const parent = klass.properties[prop.property]
						if (parent) return to_hint(prop.property, parent)
						return unknown
					case 'class':
						return prop.extends
					case 'i18n':
						return 'string'
					case 'pull':
						return `ReturnType<${prop.path
							.map((path, i, a) => {
								if (i === a.length - 1) return `["${path}"]`
								if (path === p) return unknown
								const parent = klass.properties[path]
								return to_hint(path, parent)
							})
							.join('')}>`
				}
				return JSON.stringify(prop)
			}
			const entries = Object.entries(klass.properties)
			const decl = `$.${k} = class ${k} extends $.${klass.extends} {`
			return entries.length < 1
				? [decl + '}']
				: [
						decl,
						...entries
							.flatMap(([p, prop]) => {
								const { writable, parent_key } = prop as typeof prop & {
									parent_key?: true
								}
								const hint = to_hint(p, prop)
								const args = [parent_key && ['id'], writable && [NEXT, `{${hint}} [${NEXT}]`]].filter(
									Boolean,
								) as [name: string, type?: string][]

								return [
									...(comments && (args.length > 0 || hint)
										? [
												'/**',
												...args.map(([n, t]) => ` * @param ${t ?? '{any} ' + n}`),
												...(hint ? [` * @returns {${hint}}`] : []),
												' */',
											]
										: []),
									`${p}(${args.map(([n]) => n).join(', ')}) {`,
									...body(p, prop, comments).map(l => '\t' + l),
									'}',
								]
							})
							.map(l => '\t' + l),
						`}`,
						...entries
							.filter(
								([_, { key, type, writable }]) =>
									key || writable || type === 'class' || type === 'bidi',
							)
							.map(([p]) => '$' + `mol_mem($.${k}.prototype, "${p}")`),
						'',
					]
		})
		return lines.join('\n')
	}
}

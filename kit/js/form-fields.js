import { html, useState } from 'app/modules';

export function FormField({ attributes, children, ...props })
{
	if(!attributes && !props) return;
	const { style, className, ...cleanProps } = props;
	if(!attributes) attributes = cleanProps;
	
	return html`
		<div class=${className || 'form-floating'} style=${style}>
			${(attributes.type === 'select')
				? html`<${FormFieldSelect} attributes=${attributes}>${children}<//>` 
				: html`<input ...${attributes} />`
			}
			${attributes.type !== 'hidden' ? html`<label htmlFor=${attributes.name}>${attributes.placeholder}</label>` : ''}
		</div>`;
}

export function FormFieldSelect({ attributes, children })
{
	if(!attributes && !children) return;
	const [options, setOptions] = useState(attributes?.options || null);
	
	return html`
		<select class="w-full" ...${attributes}>
			${options ? options.map((item) => html`<option key=${item.value} value=${item.value}>${item.label}</option>`) : ''}
			${children}
		</select>`;
}
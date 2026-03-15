import { html, createContext, useContext, useState, useCallback, useMemo } from 'app/modules';

const UIDispatcherContext = createContext();
const UILoadingContext = createContext();
const UISpinnerContext = createContext();
const UISidebarContext = createContext();
const InteractiveContentContext = createContext();

export function UIProvider({ children })
{
	const [isLoading, setLoading] = useState(false);
	const [isSpinner, setSpinner] = useState(false);
	const [isSidebarOpen, setSidebar] = useState(false);
	const [isInteractiveContentOpen, setInteractiveContentStatus] = useState(false);
	const [content, setContent] = useState(null);
	
	const toggleSidebar = useCallback((val = null) => {
		setSidebar(prev => (typeof val === 'boolean' ? val : !prev));
	}, []);
	
	const patchContent = useCallback((component) => {
		setContent(component);
		setInteractiveContentStatus(true);
	}, []);
	
	const valDispatcher = useMemo(() => ({ toggleSidebar, setLoading, setSpinner, setInteractiveContentStatus, patchContent }), [toggleSidebar, patchContent]);
	const valInteractiveContent = useMemo(() => ({ isInteractiveContentOpen, content }), [isInteractiveContentOpen, content]);
	
	return html`
		<${UIDispatcherContext.Provider} value=${valDispatcher}>
			<${UILoadingContext.Provider} value=${isLoading}>
				<${UISpinnerContext.Provider} value=${isSpinner}>
					<${UISidebarContext.Provider} value=${isSidebarOpen}>
						<${InteractiveContentContext.Provider} value=${valInteractiveContent}>${children}<//>
					<//>
				<//>
			<//>
		<//>`;
}

export const useUIDispatcher = () => useContext(UIDispatcherContext);
export const useUILoading = () => useContext(UILoadingContext);
export const useUISpinner = () => useContext(UISpinnerContext);
export const useUISidebar = () => useContext(UISidebarContext);
export const useInteractiveContent = () => useContext(InteractiveContentContext);

export function InteractiveContentWrapper()
{
	const { isInteractiveContentOpen, content } = useInteractiveContent();
	if(!isInteractiveContentOpen) return;
	return content;
}

export function InteractiveContent({ title = 'Quick View', type = 'quickview', withFooter = false, children })
{
	const { setInteractiveContentStatus } = useUIDispatcher();
	const closeContent = () => setInteractiveContentStatus(false);
	
	return html`
		<div class="fullscreen overlay interactive ${(type === 'popup') ? 'popup' : ''}" >
			<div class="interactive-wrapper ${(type === 'quickview') ? 'quickview' : 'popup'}">
				<div class="header">
					<h3 class="m-0">${ title }</h3>
					<button onClick=${closeContent} class="btn btn-toggle-interactive" aria-label="Close content">\u00D7</button>
				</div>
			
				<div class="content">${ children }</div>
			
				${(withFooter) ? html`
					<div class="footer">
						<button class="btn btn-secondary" onClick=${closeContent}>Close</button>
						<button class="btn btn-primary">Save Changes</button>
					</div>` : ''
				}
			</div>
		</div>`;
}

export function LoadingBar()
{
	const isLoading = useUILoading();
	if(!isLoading) return;
	
	return html`
		<div class="loading-track">
			<div class="loading-dash" aria-label="Loading bar moving" aria-live="loading bar"></div>
		</div>`;
}

export function Spinner()
{
	const isSpinner = useUISpinner();
	if(!isSpinner) return;
	
	return html`
		<div class="fullscreen overlay">
			<div class="spinner-container">
				<div class="spinner-wrapper">
					<div class="spinner" aria-label="Loading spinning" aria-live="loading spinner"></div>
				</div>
			</div>
		</div>`;
}
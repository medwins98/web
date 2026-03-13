import { render, h, html, useState, useReducer, useEffect, useMemo, useCallback, useRef } from 'app/modules';
import { LoadingBar, Spinner, InteractiveContentWrapper, InteractiveContent, UIProvider, useUIDispatcher, useUISidebar } from 'app/modules';
import { FormField } from 'app/modules';
import { MAP_KEY, mapData, joinData, generateReport, formatValue } from 'app/modules';
import { TableWrapper, DetailWrapper, MainDashboard } from 'app/modules';
import { DonateComponent } from 'app/modules';
//import { createClient } from 'supabase';

const SUPABASE_URL = 'https://csnkzanmarcgwpujbyol.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pQvQWZSOM_zPyBTM2oWajw_Le1kYlGZ';
//const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const Fragment = (props) => props.children;
const elapp = document.getElementById('app');
render(html`<${AppComponent} elroot=${elapp} />`, elapp);

function AppProvider({ elroot = null, children, routesMap = null })
{
	return html`
		<${UIProvider}>
			${children}
		<//>`;
}

function AppComponent({ elroot, routesMap = null })
{
	return html`
		<${AppProvider} elroot=${elroot} routesMap=${routesMap} >
			<${NavbarComponent}>
				<${LoadingBar} />
			<//>
			<main id="main">
				<${MainComponent} />
			</main>
			<${InteractiveContentWrapper} />
			<${Spinner} />
		<//>`;
}

function NavbarComponent({ children })
{
	const style = {
		position: '-webkit-sticky',
		position: 'sticky',
		top: 0,
		backgroundColor: '#fff',
		zIndex: 997
	};
	
	return html`
		<div class="header" style=${style}>
			<nav class="navbar" class="w-full flex items-center" style="height: 56px; padding: 0 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);">
				<h1 class="flex-1" style="margin: 0 0 0 8px;">Playground</h1>
			</nav>
			${children}
		</div>`;
}

function MainComponent()
{
	return html`<${MainPage} pageKey='businessList' />`;
}

function MainPage()
{
	const { patchContent } = useUIDispatcher();
	
	const allData = useRef(null);
	const [dataKey, setDataKey] = useState(null);

	const uploadBtnHandler = useCallback(() => setDataKey(null), []);
	
	const showDonate = useCallback(() => {
		const DetailContainer = html`
			<${InteractiveContent} title="Support Me" type="popup" key="donate">
				<${DonateComponent} />
			<//>`;
		patchContent(DetailContainer);
	}, []);
	
	const saveData = useCallback(async(data) => {
		allData.current = data;
		setDataKey('summary');
	}, [allData]);
	
	const handleSelect = useCallback((e) => setDataKey(e.target.value), []);

	const showDetails = useCallback((key) =>
	{
		const selectedData = allData.current.joined.find(d => d.orderId === key);
		const DetailContainer = html`
			<${InteractiveContent} title="Order ${key}" key=${key}>
				<${DetailWrapper} orderId=${key} data=${selectedData} />
			<//>`;
		patchContent(DetailContainer);
	}, [allData]);
	
	const actionHandler= (dataKey === 'summary') ? showDetails : null;
	if(!dataKey) return html`<${FormUploadReport} dataHandler=${saveData} />`;
	
	return html`
		<div class="flex items-center justify-between gap-2">
			<${FormField} className="w-full flex-1 form-floating" type="select" placeholder="Select data to display" onChange=${handleSelect} >
				<option value="summary" selected>Summary</option>
				<option value="report">Analysis</option>
				<option value="order">Order</option>
				<option value="transaction">Transaction</option>
				<option value="serviceFee">Service Fee</option>
				<option value="adjustment">Adjustment</option>
				<option value="discrepancy">Discrepancy</option>
			<//>
			<${ButtonIcon} onClick=${uploadBtnHandler} icon="upload" className="btn btn-secondary" title="Upload"><//>
			<${ButtonIcon} onClick=${showDonate} icon="donate" className="btn btn-secondary" title="Donate"><//>
		</div>
		${(dataKey !== 'report')
			? html`
				<div class="mb-4">
					<div class="grid gap-2" style="grid-template-columns: repeat(2, 1fr);">
						<div class="card grid-item-card">
							<div class="title">Order Relation Found</div>
							<div class="result default">${allData.current.orderRelationCount}/${allData.current.transaction.length}</div>
						</div>
						<div class="card grid-item-card">
							<div class="title">Adjustment</div>
							<div class="result default">${allData.current.adjustmentCount}</div>
						</div>
						<div class="card grid-item-card">
							<div class="title">Return</div>
							<div class="result default">${allData.current.returnCount}</div>
						</div>
						<div class="card grid-item-card">
							<div class="title">Discrepancy</div>
							<div class="result default">${allData.current.discrepancyCount}</div>
						</div>
					</div>
				</div>
				<${TableWrapper} key=${dataKey} data=${allData.current[dataKey]} columnMap=${MAP_KEY[dataKey]} actionHandler=${actionHandler} />`
			: html`<${MainDashboard} key="report" data=${allData.current.report} />`
		}`
}

function FormUploadReport({ dataHandler = null })
{
	const { setSpinner, setLoading } = useUIDispatcher();
	const files = useRef({ order: null, transaction: null });
	const handleChange = (e) => files.current[e.target.name] = e.target.files[0];
	
	const loggingUsage = useCallback(async(name, rowCount) =>
	{
		const { error } = await supabase
			.from('ecommerce_report_logs')
			.insert([
				{ 
					username: name, 
					rows_processed: rowCount 
				}
			]);
		if(error) {
			//console.log("Log failed: " + error.message);
		}
		else {
			//console.log("Ok");
		}
	}, []);
	
	const handleSubmit = useCallback(async(e) =>
	{
		e.preventDefault();
		setSpinner(true);
		
		// Helper to read file as Promise
		const readFile = (f) => new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target.result);
			reader.readAsArrayBuffer(f);
		});
			
		try
		{
			const [orderRes, transRes] = await Promise.all([
				readFile(files.current.order),
				readFile(files.current.transaction)
			]);
			
			const oWB = XLSX.read(new Uint8Array(orderRes), { type: 'array', cellFormula: false });
			const tWB = XLSX.read(new Uint8Array(transRes), { type: 'array', cellFormula: false });
			const base = {
				order: mapData(XLSX.utils.sheet_to_json(oWB.Sheets[oWB.SheetNames[0]], { range: 0, defval: "" }), 'order'),
				slug: XLSX.utils.sheet_to_json(tWB.Sheets[tWB.SheetNames[0]], { range: 1, defval: "" }),
				serviceFee: mapData(XLSX.utils.sheet_to_json(tWB.Sheets[tWB.SheetNames[2]], { range: 1, defval: "" }), 'serviceFee'),
				adjustment: mapData(XLSX.utils.sheet_to_json(tWB.Sheets[tWB.SheetNames[3]], { range: 15, defval: "" }), 'adjustment'),
				discrepancy: mapData(XLSX.utils.sheet_to_json(tWB.Sheets[tWB.SheetNames[4]], { range: 1, defval: "" }), 'discrepancy')
			};
			base.transaction = mapData(XLSX.utils.sheet_to_json(tWB.Sheets[tWB.SheetNames[1]], { range: 5, defval: "" }), 'transaction', base);
			base.joinedResult = joinData(base.order, base.transaction);
			base.joined = base.joinedResult.transaction;
			base.joinedOrder = base.joinedResult.order;
			base.summary = base.joined.filter(d => d.hasAdjustment === 'Y' || d.hasDiscrepancy === 'Y' || (d?.hasReturn || 'N') === 'Y');
			base.report = generateReport(base.joinedOrder);
			base.uniqueOrderCount = base.joinedOrder?.length || 0;
			base.orderRelationCount = base.transaction.filter(d => d.orderRelation)?.length || 0;
			base.returnCount = base.joined.filter(d => d.hasReturn === 'Y')?.length || 0;
			base.adjustmentCount = base.joined.filter(d => d.hasAdjustment === 'Y')?.length || 0;
			base.discrepancyCount = base.joined.filter(d => d.hasDiscrepancy === 'Y')?.length || 0;
			base.slug = Object.values(base.slug[1])[1];
			//loggingUsage(base.slug, base.orderRelationCount.length);
			dataHandler(base);
		}
		catch(err) {
			alert('Error processing file!\n\nMake sure you upload correct files');
			console.error("Error processing files:", err);
		}
		finally {
			setSpinner(false);
		}
	}, [dataHandler, mapData, loggingUsage], setSpinner);
	
	return html`
		<div class="fullscreen">
			<div class="flex items-center h-full">
				<form class="card p-4" onSubmit=${handleSubmit} key="uploadReport">
					<h2 key="title" style="padding: 1.5rem;" class="text-center">Upload Report</h2>
					<${FormField} key="order" name="order" type="file" accept=".xlsx, .xls, .ods" placeholder="Order Report" required="true" onChange=${handleChange} />
					<${FormField} key="transaction" name="transaction" type="file" accept=".xlsx, .xls, .ods" placeholder="Transaction Report" required="true" onChange=${handleChange} />
					<button class="btn btn-primary w-full" type="submit" key="submit" >Process<//>
				</form>
			</div>
		</div>`
}

function Icon({ type = null })
{
	const icon = {
		upload: html`
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 1.25rem; height: 1.25rem;" fill="currentColor">
				<path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3V416c0 17.7 14.3 32 32 32s32-14.3 32-32V109.3l73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64c0 53 43 96 96 96H352c53 0 96-43 96-96v-64c0-17.7-14.3-32-32-32s-32 14.3-32 32v64c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32v-64z"/>
			</svg>`,
		donate: html`
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 1.25rem; height: 1.25rem;" fill="currentColor">
				<path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/>
			</svg>`
	};
	
	return icon[type];
}

function ButtonIcon({ icon = null, children, ...props })
{
	const { style, className, ...cleanProps } = props;
	
	return html`<button class="flex items-center gap-2 ${className || ''}" ...${cleanProps} style=${style}><${Icon} type=${icon} /> ${children}</button>`;
}
import { html, useState, useEffect, useMemo, useRef, useCallback } from 'app/modules';
import { useUIDispatcher } from 'app/modules';
import { FormField } from 'app/modules';
import { InteractiveContent, Spinner } from 'app/modules';
import { MAP_KEY, formatValue } from 'app/modules';

/**
 * Selective Picker
 */
const getCellValue = (row, path) => {
	if (!path) return '-';
	return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), row);
};

const formatCellValue = (val, row = null) =>
{
	if(val instanceof Object) return val;
	if(val instanceof Date) return String(val.toLocaleDateString());
	
	if(val === null || val === undefined)
	{
		if(row.format !== 'currency' || row.format !== 'number') {
			return '-';
		}
		val = 0;
	}
	
	if(row.format === 'currency') {
		val = parseFloat(val.toString().replace(/\./g, '')) || 0;
		val = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
	}
	return val;
};

/**
 * Generic sort function for arrays of any type.
 * @param {Array} array - The data to sort.
 * @param {string|null} key - The object key to sort by (optional).
 * @param {boolean} desc - Sort in descending order? (default: false).
 */
 
const universalSort = (array, key = null, desc = false) =>
{
	return [...array].sort((a, b) => {
		let valA = key ? a[key] : a;
		let valB = key ? b[key] : b;

		// Handle null/undefined (push to the end)
		if (valA == null) return 1;
		if (valB == null) return -1;

		// Logic for different types
		let result = 0;
		if(typeof valA === 'number' && typeof valB === 'number') {
			result = valA - valB;
		}
		else if(valA instanceof Date && valB instanceof Date) {
			result = valA - valB;
		}
		else {
			// Fallback for strings and booleans
			valA = valA.toString().toLowerCase();
			valB = valB.toString().toLowerCase();
			result = valA.localeCompare(valB);
		}

		return desc ? result * -1 : result;
	});
};

export function TableWrapper({ data = [], columnMap = [], actionHandler = null, enableFilter = true, enableSorting = false })
{
	const { setSpinner, patchContent } = useUIDispatcher();
	const [optimizedData, setOptimizedData] = useState([]);
	const [columnList, setColumnList] = useState(columnMap);
	const rowSort = useRef({});
	
	const activeColumnMap = useMemo(() => {
		if(columnList && columnList.length > 0) return columnList;
		return Object.keys(data[0]).map(key => ({
			label: formatKey(key),
			key: key
		}));
	}, [data, columnList]);
	
	const hasParentHeaders = activeColumnMap.some(col => col.parent);
	
	useEffect(() => setSpinner(false), [optimizedData]);
	
	useEffect(() =>
	{
		if(!data || data.length === 0) {
			setOptimizedData([]);
			return;
		}
		setSpinner(true);
		
		let currentIndex = 0;
		const chunkSize = (data.length > 399) ? 15 : 75;
		const localResults = [];

		const processBatch = () =>
		{
			const limit = Math.min(currentIndex + chunkSize, data.length);

			for(let i = currentIndex; i < limit; i++)
			{
				const row = data[i];
				const _flat = {};
				
				columnList.forEach(col => _flat[col.accessorKey] = getCellValue(row, col.accessorKey));

				localResults.push({
					...row,
					_flat: _flat
				});
			}

			currentIndex = limit;

			if(currentIndex < data.length) {
				requestAnimationFrame(processBatch);
			}
			else {
				setOptimizedData(localResults);
				setSpinner(false);
			}
		};
		
		processBatch();
		return () => { currentIndex = data.length; }; 
	}, [data, columnList, setSpinner]);
	
	const handleFilter = useCallback((e) =>
	{
		let selected = [];
		
		for(const option of e.target.selectedOptions) {
			selected.push(option.value);
		}
		
		if(selected.length === e.target.options.length) {
			alert('At least one column must remain visible');
			return;
		}
		
		selected = Array.from(new Set(selected));
		const currentColumn = columnMap.filter(m => !selected.includes(m.accessorKey));
		
		//console.log(JSON.stringify(currentColumn, null, '\t'));
		setColumnList(currentColumn);
	}, [columnMap]);
	
	const handleSort = useCallback((e) =>
	{
		const key = e.target.value || e.target.id;
		const isUsingSelect = e.target.value || false;
		
		// true for descending
		if(!isUsingSelect && !rowSort.current[key]) rowSort.current[key] = true;
		else rowSort.current[key] = (!rowSort.current[key]);
		
		const sorted = universalSort(optimizedData, key, rowSort.current[key]);
		
		setOptimizedData(sorted)
	}, [optimizedData]);
	
	const showDetail = useCallback((selectedData, mapConfig) =>
	{
		const DetailComponent = html`
			<${InteractiveContent} title=${mapConfig.label}>
				${ (mapConfig.key === 'itemList')
					? html`<${OrderItemList} data=${selectedData} keyMap=${MAP_KEY[mapConfig.key]} />`
					: html`<${TableWrapper} data=${selectedData} columnMap=${MAP_KEY[mapConfig.key]} enableFilter=${false} enableSorting=${false} />`
				}
			<//>`;
		patchContent(DetailComponent);
	}, []);
	
	const formatCellValue = useCallback((val, mapConfig = null) =>
	{
		if(val === null || val === undefined || val === "") {
			if(mapConfig.format !== 'currency' && mapConfig.format !== 'number') {
				return '-';
			}
			val = 0;
		}
		if(val instanceof Date) return String(val.toLocaleDateString());
		if(Array.isArray(val)) return html`
			<button class="btn btn-secondary" onClick=${(e) => showDetail(val, mapConfig)}>
				Detail
			</button>`;
		if(val instanceof Object) return String(val);
		
		if(mapConfig.format === 'currency') {
			val = parseFloat(val.toString().replace(/\./g, '')) || 0;
			val = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
		}
		
		return val;
	}, [showDetail]);
	
	return html`
		${ (enableFilter) && html`
			<${FormField} key="filter" type="select" name="filter" placeholder="Hide Column" multiple="true" onChange=${handleFilter}>
				${columnMap.map((item) => html`<option value=${item.accessorKey}>${item.header}</option>`)};
			<//>
		`}
		${ (enableSorting) && html`
			<${FormField} key="sort" type="select" name="sort" placeholder="Sort by Column" onChange=${handleSort}>
				<option value="" selected="true">Initial</option>
				${columnMap.map((item) => html`<option value=${item.accessorKey}>${item.header}</option>`)};
			<//>
		`}
		<div class="table-container">
			<table class="table-heavy">
				<thead>
					${hasParentHeaders && html`
						<tr>
							${activeColumnMap.reduce((acc, col, i, arr) => {
								if(i > 0 && col.parent === arr[i - 1].parent) return acc;
								const colSpan = arr.filter(c => c.parent === col.parent).length;
								return [...acc, html`
									<th colspan=${colSpan} rowspan=${col.parent ? 1 : 2} class="text-center">
										${col.parent || col.header}
									</th>`
								];
							}, [])}
						</tr>
					`}
					<tr>
						${activeColumnMap.map(col => {
							if(hasParentHeaders && !col.parent) return null;
							return html`
								<th id=${col.accessorKey} onClick=${handleSort} class="text-center p-3 cursor-pointer">
									${col.header} 
									<span class="arrow">
										${rowSort.current[col.accessorKey] ? ' ▲' : ' ▼' }
									</span>
								</th>`;
						})}
						${actionHandler ? html`<th class="text-center">Action</th>` : ''}
					</tr>
				</thead>
				<tbody>
					${optimizedData.map((row, i) => html`
						<tr key=${row.orderId || i}>
							${columnList.map(col => html`
								<td key=${`data${col.accessorKey}`} class="text-center">
									${formatCellValue(row._flat[col.accessorKey], col)}
								</td>`
							)}
							${actionHandler && html`<td key="action" class="text-center"><button class="btn btn-primary" onClick=${() => actionHandler(row.orderId)}>Detail</button></td>`}
						</tr>
					`)}
				</tbody>
			</table>
		</div>
	`;
}

export function DetailWrapper({ orderId, data })
{
	if(!data) return;
	const key = orderId;
	const { serviceFeeDetail, adjustmentDetail, discrepancyDetail, orderRelation, returnRelation, ...transaction } = data;
	//console.log('DetailWrapper:', JSON.stringify(orderRelation, null, '\t'));
	
	return html`
		<div style="flex flex-column; gap-3">
			${(transaction.hasDiscrepancy === 'Y') ? html`
				<div>
					<h3>Selisih</h3>
					<${DetailComponent} key="${key}-discrepancyDetail" data=${discrepancyDetail} keyMap=${MAP_KEY.discrepancy} type="discrepancy"/>
				</div>` : ''
			}
			
			${(transaction.hasAdjustment === 'Y') ? html`
				<div>
					<h3>Penyesuaian</h3>
					<${DetailComponent} key="${key}-adjustmentDetail" data=${adjustmentDetail} keyMap=${MAP_KEY.adjustment} type="adjustment"/>
				</div>` : ''
			}
			
			${(transaction.hasReturn === 'N' && orderRelation) ? html`
				<div>
					<h3>Ringkasan Pesanan</h3>
					<${DetailComponent} key="${key}-orderDetail" data=${orderRelation} keyMap=${MAP_KEY.orderFiltered} type="order"/>
				</div>` : ''
			}
			
			<${OrderItemList} key="${key}-itemListDetail" data=${orderRelation?.itemList || null} keyMap=${MAP_KEY.itemList} type="itemList"/>
			
			<div>
				<h3>Rincian Transaksi</h3>
				<${DetailComponent} key="${key}-transactionDetail" data=${transaction} keyMap=${MAP_KEY.transaction} type="transaction"/>
			</div>
			
			${(transaction.hasReturn === 'N') ? html`
				<div>
					<h3>Biaya Layanan</h3>
					<${DetailComponent} key="${key}-serviceFeeDetail" data=${serviceFeeDetail} keyMap=${MAP_KEY.serviceFee} type="serviceFee"/>
				</div>` : ''
			}
		</div>`;
}

function DetailComponent({ data, keyMap = null, type = null })
{
	if(!data || !keyMap) return;
	data = (Array.isArray(data)) ? data : [data];
	
	if(data.length > 1) return html`<${TableWrapper} data=${data} columnMap=${keyMap} enableFilter=${false} enableSorting=${false} />`;
	
	return html`
		<table>
			${keyMap.map(row => 
				data?.map(item =>
					(row.accessorKey === 'orderId') ? '' : html`
					<tr>
						<th>${row.header}</th>
						<td>${formatValue(item[row.accessorKey], row.format)}</td>
					</tr>
				`)
			)}
		</table>`;
}

function OrderItemList({ data })
{
	if(!data) return;
	const items = data;
	return html`
		<div class="order-items">
			<div class="oi-header">
				<span>RINCIAN PRODUK DIPESAN</span>
				<span>SUBTOTAL</span>
			</div>
			
			${items.map((item, index) => html`
				<div key=${index} class="oi-item-wrapper" style="border-bottom: ${index === items.length - 1 ? 'none' : '1px solid #f3f4f6'};">
					<div class="oi-product-info">
						<div class="product-title">${item.productName}</div>
						<div class="product-sku-info">
							<span class="sku-code">SKU: ${item.variantSku}</span>
							<span class="sku-name">Variant: ${item.variationName}</span>
						</div>
						
						<div class="detail-info">
							<span>Berat Satuan: <b>${item.weight}g</b></span>
							<span>Total Berat: <b>${item.totalWeight}g</b></span>
							<span>Returned / Cancelled: <b>Qty ${item.returnedQuantity}</b></span>
						</div>
					</div>
					
					<div class="oi-subtotal">
						<div class="item-subtotal">${formatValue(item.totalProductPrice, 'currency')}</div>
						<div class="item-total-price">${item.quantity} x ${formatValue(item.discountedPrice, 'currency')}</div>
						${item.originalPrice !== item.discountedPrice ? html`
							<div class="item-discount">${formatValue(item.originalPrice, 'currency')}</div>
						` : ''}
					</div>
				</div>
			`)}
			
			<div class="oi-footer">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				<span>Pastikan berat total sesuai dengan timbangan kurir untuk menghindari selisih ongkir.</span>
			</div>
		</div>`;
}

function ChartComponent({ data, type })
{
	const canvasRef = useRef(null);
	const chartInstance = useRef(null);
	const [metric, setMetric] = useState('order');

	useEffect(() =>
	{
		if(!data) return;
		const ctx = canvasRef.current.getContext('2d');
		if(chartInstance.current) {
			chartInstance.current.destroy();
		}
		
		const isValue = metric === 'value';
		
		if(type === 'peakTimeByHours' || type === 'peakTimeByDays')
		{
			const sortedData = (type === 'peakTimeByHours')
				? [...data].sort((a, b) => a.hour - b.hour)
				: [...data].sort((a, b) => {
					const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
					return order.indexOf(a.day) - order.indexOf(b.day);
				});
				
			chartInstance.current = new Chart(ctx, {
				type: isValue ? 'line' : 'bar',
				data: {
					labels: sortedData.map(d => (type === 'peakTimeByHours') ? `${d.hour}:00` : d.day),
					datasets: [{
						label: isValue ? 'By Value' : 'By Order',
						data: sortedData.map(d => isValue ? d.value : d.order),
						backgroundColor: isValue ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.5)',
						borderColor: isValue ? '#10b981' : '#3b82f6',
						borderWidth: 2,
						fill: isValue,
						tension: 0.4
					}]
				},
				options: {
					responsive: true,
					plugins: {
						tooltip: {
							callbacks: {
								label: (context) => {
									const val = context.raw;
									return isValue ? `Rp ${val.toLocaleString('id-ID')}` : `${val} Order`;
								}
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: (val) => isValue ? `Rp ${val.toLocaleString('id-ID')}` : val
							}
						}
					}
				}
			});
		}
		
		if(type === 'payment')
		{
			chartInstance.current = new Chart(ctx, {
				type: 'doughnut',
				data: {
					labels: data.map(i => i.method),
					datasets: [{
						data: data.map(i => parseFloat(i.share)),
						//backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
					}]
				},
				options: {
					responsive: true,
					plugins: {
						legend: { position: 'left' }
					}
				}
			});
		}
		
		if(type === 'courier')
		{
			chartInstance.current = new Chart(ctx, {
				type: 'doughnut',
				data: {
					labels: data.map(c => c.name),
					datasets: [{
						data: data.map(c => parseFloat(c.share)),
						/*
						backgroundColor: [
							'#f97316', '#3b82f6', '#10b981', '#6366f1', 
							'#ef4444', '#a855f7', '#ec4899', '#71717a'
						],
						*/
						borderWidth: 1
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: 'right',
							labels: { boxWidth: 12, padding: 15 }
						}
					},
					cutout: '65%'
				}
			});
		}
	
		return () => chartInstance.current?.destroy();
	}, [data, type, metric]);
	
	const titleMap = {
		peakTimeByHours: 'Peak Time by Hour (24h)',
		peakTimeByDays: 'Peak Time by Day',
		payment: 'Payment Method Distribution (%)',
		courier: 'Top Couriers by Volume'
	};
	
	return html`
		<div class="card">
			<div class="text-center">
				<h3>${titleMap[type]}</h3>
				${ (type.includes('peakTime')) ? html`
					<div class="p-1 rounded-lg">
						<button class="btn btn-secondary mr-1" onClick=${() => setMetric('order')}>Order Count</button>
						<button class="btn btn-secondary ml-1" onClick=${() => setMetric('value')}>Value</button>
					</div>` : ''
				}
			</div>
			<div>
				<canvas ref=${canvasRef}></canvas>
			</div>
		</div>
	`;
}


function CustomerReport({ data })
{
	return html`
		<div class="customerReport">
			<div style="margin-bottom: 20px">
				<h3 style="margin-bottom: 1.5rem;">Customer Report</h3>
				<div class="grid" style="grid-template-columns: repeat(3, 1fr); gap: 8px;">
					<div class="card grid-item-card">
						<div class="title">Unique Customer</div>
						<div class="result default">${data.uniqueCount}</div>
					</div>
					<div class="card grid-item-card">
						<div class="title">Repeat Purchase</div>
						<div class="result default">${data.repeatPurchaseCount}</div>
					</div>
					<div class="card grid-item-card">
						<div class="title">Rate</div>
						<div class="result default">${data.repeatPurchaseRate}</div>
					</div>
				</div>
			</div>
			<div class="top-customer">
				<h3>Top 10 Customers</h3>
				<${TableWrapper} data=${data.topCustomer.slice(0, 10)} columnMap=${MAP_KEY.topCustomer} enableFilter=${false} />
			</div>
		</div>`;
}

function RegionalReport({ data })
{
	return html`
		<div class="card" style="padding: 1.25rem">
			<h3 style="margin-bottom: 1.5rem;">Regional Performance</h3>
			<div class="flex flex-col gap-4">
				${data.map(reg => html`
					<div class="report-item">
						<div class="report-main-info">
							<span class="info-title">${reg.province}</span>
							<span class="info-description">${reg.orderCount} Orders</span>
						</div>
						
						<div class="bar-container">
							<div class="bar-fill" style="width: ${reg.share};"></div>
						</div>

						<div class="report-sub-info">
							<span>Total: <b>${formatValue(reg.totalValue, 'currency')}</b></span>
							<span>Avg: <b>${formatValue(reg.avgSpend, 'currency')}</b></span>
						</div>
					</div>
				`)}
			</div>
		</div>
	`;
}

function SkuReport({ data })
{
	const skuEntries = Object.entries(data).sort((a,b) => b[1].totalUnitsInOrder - a[1].totalUnitsInOrder || b[1].totalPotentialRevenue - a[1].totalPotentialRevenue);

	return html`
		<div>
			<h3 style="margin-bottom: 20px;">SKU Performance</h3>
			<div class="list-column-flex">
				${skuEntries.map(([sku, info]) => html`
					<div class="card">
						<div class="sku-performance-header">
							<div style="max-width: 70%;">
								<div class="sku-code">${sku}</div>
								<div class="sku-name">${info.productName}</div>
							</div>
							<div class="text-right">
								<div class="sku-revenue">${formatValue(info.totalRealizedRevenue, 'currency')}</div>
								<div class="sku-total-qty">${info.totalUnitsInOrder} Units Sold</div>
							</div>
						</div>

						<div class="sku-performance-content">
							${info.variant.map(v => html`
								<div class="info-wrapper">
									<span class="sku-name">${v.variantName}</span>
									<span>
										<b class="sku-qty">${v.totalUnitsInOrder} Qty</b>
										<span class="sku-contribution">${v.contribution} Share</span>
									</span>
								</div>
								
								<div class="bar-container">
									<div class="bar-fill" style="width: ${v.contribution};"></div>
								</div>
							`)}
						</div>

						<div class="sku-performance-footer">
							<!--<span>Cancel Rate: <b style="color: ${parseFloat(info.variant[0]["Cancellation Rate"]) > 0 ? '#ef4444' : '#888'}">${info.variant[0]["Cancellation Rate"]}</b></span>-->
							<span>Return Rate: <b>${info["Return Rate"]}</b></span>
							<span>UPO (Single): <b>${info.upoSingle}</b></span>
							<span>UPO (Multi): <b>${info.upoMulti}</b></span>
							<span>UPO (Total): <b>${info.upoTotal}</b></span>
						</div>
					</div>
				`)}
			</div>
		</div>
	`;
}

function BasketReport({ data })
{
	const pairs = data.variantLevel || [];

	return html`
		<div class="basket-container">
			<h3 style="margin-bottom: 20px;">Basket Analysis (Product Bundling)</h3>
			
			${pairs.length === 0 ? html`<p>Tidak ada data pola pembelian.</p>` : 
				pairs.map(item => html`
					<div class="basket-card">
						<div class="basket-header">
							<div class="basket-sku">${item.Pair.split(' + ').join(' ↔️ ')}</div>
							<span class="basket-reliability">${item.Reliability} Reliability</span>
						</div>

						<div class="basket-content">
							<div class="card grid-item-card">
								<div class="title">Occurrences</div>
								<div class="result occurrence">${item.Occurrences}x</div>
								<div class="title-alt">Muncul bersamaan</div>
							</div>
							
							<div class="card grid-item-card">
								<div class="title">Lift Score</div>
								<div class="result lift">${item.Lift}</div>
								<div class="title-alt">Kekuatan korelasi</div>
							</div>
						</div>

						<div class="basket-footer">
							<span>Confidence: <b>${item.Confidence}</b></span>
							<span>Support: <b>${item.Support}</b></span>
						</div>
					</div>
				`)
			}
			
			<p style="font-size: 11px; color: #9ca3af; margin-top: 10px;">
				* Tips: Gunakan data ini untuk membuat promo paket bundling atau rekomendasi produk di halaman checkout.
			</p>
		</div>
	`;
}

export function MainDashboard({ data })
{
	if(!data || data.customerReport.uniqueCount  === 0) return html`<div style="padding: 20px;">Tidak ada data untuk ditampilkan</div>`;

	return html`
		<div class="dashboard-container">
			<header class="dashboard-header">
				<h2 class="title">Performance Insights</h2>
			</header>
			
			<${CustomerReport} data=${data.customerReport} />
			
			<div class="report-section">
				<${ChartComponent} key="peakTimeByHoursChart" data=${data.peakTime.hours} type='peakTimeByHours' />
				<${ChartComponent} key="peakTimeByDaysChart" data=${data.peakTime.days} type='peakTimeByDays' />
			</div>

			<div class="report-section">
				<${ChartComponent} key="paymentChart" data=${data.paymentMethods} type='payment' />
				<${ChartComponent} key="courierChart" data=${data.logisticReport.couriers} type='courier' />
			</div>
			
			<div class="report-section">
				<${RegionalReport} data=${data.regionalReport} />
				<${BasketReport} data=${data.basketReport} />
			</div>

			<div>
				<${SkuReport} data=${data.skuReport} />
			</div>
		</div>
	`;
}
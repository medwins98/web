import { html, useState, useEffect, useCallback } from 'app/modules';
import QRCode from 'https://esm.sh/qrcode';

export function DonateComponent()
{
	const [qrSrc, setQrSrc] = useState('');
	const qrisData = "00020101021126610014COM.GO-JEK.WWW01189360091439292967800210G9292967800303UMI51440014ID.CO.QRIS.WWW0215ID10254672728090303UMI5204899953033605802ID5925Edwin - Developer & Creat6013JAKARTA PUSAT61051016062070703A016304D9B2";

	useEffect(() => {
		QRCode.toDataURL(qrisData, {
			width: 512,
			margin: 2,
			errorCorrectionLevel: 'H'
		})
		.then(setQrSrc)
		.catch(console.error);
	}, [qrisData]);

	const saveQris = useCallback(() => {
		const link = document.createElement("a");
		link.download = "Donasi-QRIS.png";
		link.href = qrSrc;
		link.click();
	}, [qrSrc]);

	const shareQris = useCallback(async () => {
		const res = await fetch(qrSrc);
		const blob = await res.blob();
		const file = new File([blob], "Donasi-QRIS.png", { type: "image/png" });

		if (navigator.canShare && navigator.canShare({ files: [file] })) {
			try {
				await navigator.share({
					files: [file],
					title: "Donasi QRIS",
					text: "Scan untuk donasi"
				});
			} catch (e) { if (e.name !== 'AbortError') console.error(e); }
		} else {
			alert("Browser tidak mendukung share file, gunakan tombol Simpan.");
		}
	}, [qrSrc]);

	return html`
		<div style="text-align: center; max-width: 300px; margin: auto;">
			<div style="min-height: 256px; display: flex; align-items: center; justify-content: center; background: #eee; border-radius: 12px; margin-bottom: 1rem;">
				${qrSrc 
					? html`<img src=${qrSrc} alt="QRIS" style="width: 100%; border-radius: 8px;" />`
					: html`<span>Loading QR...</span>`
				}
			</div>
			
			<div style="display: flex; gap: 8px;">
				<button class="btn btn-secondary" onClick=${saveQris} disabled=${!qrSrc} style="flex:1">Save</button>
				<button class="btn btn-secondary" onClick=${shareQris} disabled=${!qrSrc} style="flex:1">Share</button>
			</div>
		</div>
	`;
}
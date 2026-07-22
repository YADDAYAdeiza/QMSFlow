// // app/api/gmp/certificate/route.tsx
// import { renderToBuffer } from '@react-pdf/renderer';
// import { GMPCertificate } from "@/components/LocalInspectionReports/GMPCertificate";
// import { NextResponse } from 'next/server';

// export const dynamic = 'force-dynamic';

// export async function POST(req: Request) {
//   try {
//     const payload = await req.json();

//     const pdfData = {
//       appNumber: payload.application_number || 'N/A',
//       date: payload.updated_at 
//         ? new Date(payload.updated_at).toLocaleDateString('en-GB')
//         : new Date().toLocaleDateString('en-GB'),
//       facilityName: payload.checklistSnapshot?.inspected_site_name || 'N/A',
//       facilityAddress: payload.checklistSnapshot?.vicinity_assessment || 'N/A',
//       activities: payload.checklistSnapshot?.activities_carried_out || [],
//       signatoryName: "Divisional Deputy Director"
//     };

//     // 1. Render to buffer
//     const pdfBuffer = await renderToBuffer(<GMPCertificate data={pdfData} />);

//     // 2. Return as Uint8Array for NextResponse compatibility
//     return new NextResponse(new Uint8Array(pdfBuffer), {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `attachment; filename="GMP_Certificate_${payload.application_number || 'draft'}.pdf"`,
//       }
//     });
//   } catch (error) {
//     console.error('Failed to generate GMP PDF:', error);
//     return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
//   }
// }
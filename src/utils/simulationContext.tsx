'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MockUser {
  id: string;
  name: string;
  role: string;
  division: string;
  email: string;
}

// Live NAFDAC staff dataset map
export const MOCK_INSPECTORS: MockUser[] = [
  {"id":"040a41d3-277b-464c-a5fd-24ae1e3f41ae","name":"Uba Florence Nwanneka","email":"uba.florence@nafdac.gov.ng","role":"Divisional Deputy Director","division":"IRSD"},
  {"id":"0d5396c4-3757-4787-9713-c9f3c47ee600","name":"Chukwurah O Barbara","email":"chukwurah.barbara@nafdac.gov.ng","role":"Divisional Deputy Director","division":"PAD"},
  {"id":"19aa4045-47d2-4c3f-b1b0-6364b626169e","name":"Mercy Ihejirika","email":"mercy.ihejirika@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"PAD"},
  {"id":"1fa7dbbc-3c3f-49c3-82c1-113b9bff2039","name":"Paul Abiem","email":"paul.abiem@nafdac.gov.ng","role":"Divisional Deputy Director","division":"AFPD"},
  {"id":"357839c2-d3ca-4ae5-b8ae-ba89c174281b","name":"Emmanuel Ngu","email":"emmanuel.ngu@nafdac.gov.ng","role":"Staff","division":"IRSD"},
  {"id":"4db8fb83-a2f0-4103-9ee4-c610d18eb8c2","name":"Roseline Anyanwu","email":"anyanwu.roseline@nafdac.gov.ng","role":"Staff","division":"VMD"},
  {"id":"50865e98-561d-4de8-b7bd-0e4c965b9ea7","name":"Auwal sahabi ","email":"auwal.sahabi@nafdac.gov.ng","role":"Staff","division":"PAD"},
  {"id":"531ac64e-2b77-4300-953c-fe44ff2b4f95","name":"Danjuma Haruna","email":"danjuma.haruna@nafdac.gov.ng","role":"Staff","division":"PAD"},
  {"id":"54d7382d-aeb9-47b5-aed7-5044218fdb07","name":"Dauda Yakubu","email":"dauda.yakubu@nafdac.gov.ng","role":"Staff","division":"PAD"},
  {"id":"64a34684-f31d-47af-8eee-63d91c89a64f","name":"Omale Ojonimi Samuel","email":"omale.ojonimi@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"AFPD"},
  {"id":"696faea2-a8f3-449d-98a0-9b4561bd4528","name":"Yusuf Adeiza Ad","email":"adeiza.yusuf@nafdac.gov.ng","role":"Admin","division":"VMD"},
  {"id":"742039b0-787c-47eb-91a6-5e5074003697","name":"Ali Balbaya ","email":"ali.balbaya@nafdac.gov.ng","role":"Staff","division":"VMD"},
  {"id":"76e8bf53-25ee-4329-8186-dabcdc296d86","name":"Martina Omogohi","email":"hiscript3@gmail.com","role":"Staff","division":"VMD"},
  {"id":"7dc6e0c3-31f6-4978-a975-78d2125a3644","name":"Lynda Awoju","email":"lynda.awoju@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"IRSD"},
  {"id":"860b8ded-cb2b-4ecb-85ae-68a648eeed48","name":"Murjanat Aliyu","email":"murjanat.aliyu@nafdac.gov.ng","role":"Staff","division":"VMD"},
  {"id":"8ec88ab7-bd6f-4f53-94c4-883afde92751","name":"Philip Tarhemba","email":"philip.tarhemba@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"AFPD"},
  {"id":"918238c6-77d2-43ce-9c34-40d42de5984e","name":"Tunde Muhammed","email":"muhammed.oluwakemi@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"AFPD"},
  {"id":"969d2d27-bb91-4437-ad62-857c20d20e58","name":"Ahmed Dahiru","email":"ahmed.dahiru@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"IRSD"},
  {"id":"9dd46d07-022f-4174-aaa7-9625eed6b9da","name":"Mudashir Idayat","email":"mudashir.i@nafdac.gov.ng","role":"Director","division":"VMAP"},
  {"id":"a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d","name":"Mr. Biyama Kalang","email":"aliyu.ahmed@nafdac.gov.ng","role":"Staff","division":"VMD"},
  {"id":"b03d4dfd-6a77-4307-b538-d13a9f58e7d3","name":"Okibe Agbese","email":"okibe.agbese@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"VMD"},
  {"id":"b3a6462a-bac0-4c13-a82c-dcbc9b0f7b51","name":"Joseph Omale","email":"joseph.omale@nafdac.gov.ng","role":"LOD","division":""},
  {"id":"b9acc5bc-23d0-42c0-a66d-0f33ba9ce24d","name":"Yusuf Adeiza","email":"yadeizagit@gmail.com","role":"Divisional Deputy Director","division":"VMD"},
  {"id":"be4f08a5-79ba-4bd0-b631-fbf200774c98","name":"Yusuf Adeiza","email":"yadeiza@yahoo.co.uk","role":"Staff","division":"IRSD"},
  {"id":"c3d4e5f6-7a8b-9c0d-1e2f3a4b5c6d","name":"Director DER","email":"director.der@nafdac.gov.ng","role":"Director","division":"DIRECTORATE"},
  {"id":"c5a0c67a-64d3-482e-8277-1fa48ec3c743","name":"Director General","email":"director@agency.gov","role":"Staff","division":"HQ"},
  {"id":"d8d6e654-4ba3-450d-b97b-8476d89751f1","name":"Abdullahi Adamu","email":"adam.abdullahi@nafdac.gov.ng","role":"PID_AMR","division":"PID"},
  {"id":"dc5b03c4-8566-4280-b56c-7464ab5cecf4","name":"Martha Sanni","email":"martha.luka@nafdac.gov.ng","role":"Staff Technical Reviewer","division":"AFPD"},
  {"id":"ecee7b22-72b2-4c57-8da5-5b09f42d58fe","name":"Garba Isah","email":"garba.isah@nafdac.gov.ng","role":"LOD","division":"PAD"},
  {"id":"f8772174-3da3-4563-abb6-49bbfd71ce8f","name":"Areo Abidemi","email":"areo.abidemi@nafdac.gov.ng","role":"Staff","division":"IRSD"}
];

interface SimulationContextType {
  activeUser: MockUser | null;
  isSimulating: boolean;
  switchUser: (id: string) => void;
  clearSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUser] = useState<MockUser | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('qms_sim_user_id');
    if (saved) {
      const user = MOCK_INSPECTORS.find(u => u.id === saved);
      if (user) {
        setActiveUser(user);
        setIsSimulating(true);
      }
    }
  }, []);

  const switchUser = (id: string) => {
    const user = MOCK_INSPECTORS.find(u => u.id === id);
    if (user) {
      localStorage.setItem('qms_sim_user_id', id);
      setActiveUser(user);
      setIsSimulating(true);
      window.location.reload();
    }
  };

  const clearSimulation = () => {
    localStorage.removeItem('qms_sim_user_id');
    setActiveUser(null);
    setIsSimulating(false);
    window.location.reload();
  };

  return (
    <SimulationContext.Provider value={{ activeUser, isSimulating, switchUser, clearSimulation }}>
      {children}
    </SimulationContext.Provider>
  );
}

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used within a SimulationProvider');
  return context;
};
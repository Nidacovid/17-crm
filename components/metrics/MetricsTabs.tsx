"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ProfitabilityTab,
  type ProfitabilityData,
} from "@/components/metrics/ProfitabilityTab";
import {
  CollectionsTab,
  type CollectionsData,
} from "@/components/metrics/CollectionsTab";

// Pestañas de la pantalla de Métricas (9.2). La oleada A trae Rentabilidad y
// Cobros; las oleadas posteriores añadirán Tiempo y Negocio · Estimador.
export function MetricsTabs({
  profitability,
  collections,
}: {
  profitability: ProfitabilityData;
  collections: CollectionsData;
}) {
  const [tab, setTab] = useState("rentabilidad");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="rentabilidad">Rentabilidad</TabsTrigger>
        <TabsTrigger value="cobros">Cobros</TabsTrigger>
      </TabsList>
      <TabsContent value="rentabilidad">
        <ProfitabilityTab data={profitability} />
      </TabsContent>
      <TabsContent value="cobros">
        <CollectionsTab data={collections} />
      </TabsContent>
    </Tabs>
  );
}

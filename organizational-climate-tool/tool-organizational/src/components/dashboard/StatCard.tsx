"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardCheck, Smile, Star } from "lucide-react";
import React from "react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

const iconMap = {
  clipboardCheck: ClipboardCheck,
  users: Users,
  smile: Smile,
  star: Star,
};

type IconName = keyof typeof iconMap;

type StatCardProps = {
  title: string;
  value: string;
  iconName: IconName;
  change: string;
  tooltip?: string;
};

const StatCard = ({ title, value, iconName, tooltip }: StatCardProps) => {
  const Icon = iconMap[iconName];

  if (!Icon) {
    return null;
  }

  return (
    <Card className="hover:translate-y-[-5px] transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </CardTitle>
        <Icon className="h-6 w-6  text-blue-600" />
      </CardHeader>
      <CardContent>
        <div>{value}</div>
      </CardContent>
    </Card>
  );
};

export default StatCard;

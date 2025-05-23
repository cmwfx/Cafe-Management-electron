import { cn } from "@/lib/utils";
import React from "react";

interface DataCardProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	value: string | number;
	description?: string;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

export function DataCard({
	title,
	value,
	description,
	icon,
	trend,
	className,
	...props
}: DataCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border bg-card p-6 flex flex-col gap-2 transition-all hover:shadow-md hover:bg-card/80",
				className
			)}
			{...props}
		>
			<div className="flex justify-between items-start">
				<div>
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<h3 className="text-2xl font-bold leading-none tracking-tight mt-2">
						{value}
					</h3>
					{description && (
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					)}
				</div>
				{icon && (
					<div className="bg-secondary p-3 rounded-full text-muted-foreground">
						{icon}
					</div>
				)}
			</div>
		</div>
	);
}

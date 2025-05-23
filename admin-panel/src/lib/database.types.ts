export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					username: string | null;
					credits: number;
					first_name: string | null;
					last_name: string | null;
					is_admin: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username?: string | null;
					credits?: number;
					first_name?: string | null;
					last_name?: string | null;
					is_admin?: boolean;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					username?: string | null;
					credits?: number;
					first_name?: string | null;
					last_name?: string | null;
					is_admin?: boolean;
					created_at?: string;
					updated_at?: string;
				};
			};
			sessions: {
				Row: {
					id: string;
					user_id: string;
					computer_id: string;
					start_time: string;
					end_time: string | null;
					duration_minutes: number;
					credits_used: number;
					is_active: boolean;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					computer_id: string;
					start_time?: string;
					end_time?: string | null;
					duration_minutes: number;
					credits_used: number;
					is_active?: boolean;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					computer_id?: string;
					start_time?: string;
					end_time?: string | null;
					duration_minutes?: number;
					credits_used?: number;
					is_active?: boolean;
					created_at?: string;
				};
			};
			computers: {
				Row: {
					id: string;
					name: string;
					location: string | null;
					status: string;
					last_user_id: string | null;
					last_active: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					name: string;
					location?: string | null;
					status?: string;
					last_user_id?: string | null;
					last_active?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					location?: string | null;
					status?: string;
					last_user_id?: string | null;
					last_active?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			credit_transactions: {
				Row: {
					id: string;
					user_id: string;
					amount: number;
					transaction_type: string;
					description: string | null;
					session_id: string | null;
					admin_id: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					amount: number;
					transaction_type: string;
					description?: string | null;
					session_id?: string | null;
					admin_id?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					amount?: number;
					transaction_type?: string;
					description?: string | null;
					session_id?: string | null;
					admin_id?: string | null;
					created_at?: string;
				};
			};
			configurations: {
				Row: {
					id: string;
					value: Json;
					description: string | null;
					updated_at: string;
					updated_by: string | null;
				};
				Insert: {
					id: string;
					value: Json;
					description?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
				Update: {
					id?: string;
					value?: Json;
					description?: string | null;
					updated_at?: string;
					updated_by?: string | null;
				};
			};
		};
	};
}

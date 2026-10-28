import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface Props {
  onReturn: () => void;
  requiredRole?: string;
  attemptedResource?: string;
}

export const AccessDeniedView: React.FC<Props> = ({
  onReturn,
  requiredRole = 'Regulatory Administrator (ADMIN)',
  attemptedResource = 'Administrative Resource',
}) => {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-[#FECDCA] shadow-sm overflow-hidden">
        {/* Security Warning Header */}
        <div className="bg-[#FFF6ED] border-b border-[#FEE4E2] px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FEE4E2] flex items-center justify-center text-[#D92D20] shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#B42318]">Access Restricted — RBAC Enforcement</h2>
            <p className="text-xs text-[#7A271A]">
              VerityAI Institutional Security &amp; Least-Privilege Governance Policy
            </p>
          </div>
        </div>

        {/* Details & Explanation */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-[#FAFAFA] border border-[#EAECF0]">
            <Lock className="w-5 h-5 text-[#667085] mt-0.5 shrink-0" />
            <div className="space-y-1 text-xs text-[#344054]">
              <p className="font-semibold text-[#101828]">
                Privilege Level Insufficient for {attemptedResource}
              </p>
              <p>
                Your currently authenticated session lacks the required privilege level (
                <span className="font-mono font-bold text-[#1F3954]">{requiredRole}</span>).
                Under statutory scrutiny guidelines, scrutiny officers and administrative operators maintain
                strictly partitioned interfaces, permissions, and audit boundaries.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#536174]">
            <h3 className="font-semibold text-[#202936]">What you can do:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Return to your designated scrutiny workspace to inspect applications and evidence.</li>
              <li>If you require administrative configuration access, request role escalation through your department administrator.</li>
              <li>All unauthorized route access attempts are logged in compliance with AICTE audit standards.</li>
            </ul>
          </div>

          <div className="pt-2 flex items-center gap-3 border-t border-[#EAECF0]">
            <button
              onClick={onReturn}
              className="main-btn btn-hover !py-2 !px-4 text-xs font-semibold gap-2 cursor-pointer shadow-sm text-white"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Return to Permitted Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import {
  QrCode,
  MapPin,
  Building2,
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Smartphone,
  Globe,
} from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              Attend<span className="text-indigo-600">ix</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
            <a href="#branches" className="hover:text-indigo-600 transition-colors">Multi-Branch</a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-indigo-600"
              onClick={() => navigate("/employee/login")}
            >
              Employee
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
              onClick={() => navigate("/org/login")}
            >
              Organization Login
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Trusted by growing businesses
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.08] tracking-tight text-gray-900 mb-6">
            Know exactly who's
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              in the building.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Attendix lets organizations track staff attendance across multiple branches
            with QR code scanning and GPS verification — no hardware required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-6 text-base font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105"
              onClick={() => navigate("/org/login")}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-10 py-6 text-base font-bold border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              onClick={() => navigate("/employee/login")}
            >
              I'm an Employee
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-14 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Free to start</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> No hardware needed</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Multi-branch ready</span>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-gray-50/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3">Why Attendix</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              Everything you need to monitor attendance.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <QrCode className="w-6 h-6" />,
                title: "QR Code Check-In",
                desc: "Each branch gets a unique QR code. Employees scan it with their phone — done in seconds.",
                color: "indigo",
              },
              {
                icon: <MapPin className="w-6 h-6" />,
                title: "GPS Verification",
                desc: "Every check-in is tagged with GPS coordinates so you know they're actually at the branch.",
                color: "emerald",
              },
              {
                icon: <Building2 className="w-6 h-6" />,
                title: "Multi-Branch Support",
                desc: "Manage pharmacies, offices, or warehouses — each branch operates independently under one org.",
                color: "purple",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Real-Time Dashboard",
                desc: "See who checked in, when, and where — all from a single, live-updating dashboard.",
                color: "blue",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Employee Management",
                desc: "Onboard staff in seconds. They sign up, link to your org, and start scanning immediately.",
                color: "amber",
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Secure & Private",
                desc: "End-to-end authentication, encrypted tokens, and no data shared with third parties.",
                color: "rose",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors
                    ${f.color === "indigo" ? "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" : ""}
                    ${f.color === "emerald" ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" : ""}
                    ${f.color === "purple" ? "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white" : ""}
                    ${f.color === "blue" ? "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" : ""}
                    ${f.color === "amber" ? "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" : ""}
                    ${f.color === "rose" ? "bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" : ""}
                  `}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3">Simple Setup</p>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              Up and running in 3 steps.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                icon: <Building2 className="w-7 h-7" />,
                title: "Register Your Org",
                desc: "Sign up, name your organization, and your first branch is created automatically.",
              },
              {
                step: "02",
                icon: <Smartphone className="w-7 h-7" />,
                title: "Share the QR Code",
                desc: "Download or print the QR code for each branch and display it at the entrance.",
              },
              {
                step: "03",
                icon: <Clock className="w-7 h-7" />,
                title: "Employees Scan In",
                desc: "Staff scan the code on arrival. You see the check-in live on your dashboard with GPS proof.",
              },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="text-7xl font-black text-indigo-100 select-none mb-4">{s.step}</div>
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200">
                  {s.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Multi-Branch Highlight ─── */}
      <section id="branches" className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Globe className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Built for businesses with multiple locations.
          </h2>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Whether you run 2 pharmacies or 20 warehouses, Attendix gives every branch its own
            QR code, its own attendance log, and its own dashboard view — all managed under a
            single organization account.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { num: "∞", label: "Branches Per Org" },
              { num: "∞", label: "Employees Per Branch" },
              { num: "24/7", label: "Live Monitoring" },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="text-4xl font-black mb-1">{s.num}</div>
                <div className="text-sm text-indigo-200 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
            Ready to know who's showing up?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Create your organization in under a minute. No credit card, no contracts.
          </p>
          <Button
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 text-base font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105"
            onClick={() => navigate("/org/login")}
          >
            Start Tracking Attendance
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white">
                Attend<span className="text-indigo-400">ix</span>
              </span>
            </div>

            <div className="flex gap-8 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#branches" className="hover:text-white transition-colors">Multi-Branch</a>
            </div>

            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Attendix · A TasGuard Product
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

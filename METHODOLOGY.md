# Methodology

The tracker records companies whose core activity is quantum technology, classifies each on two
independent axes, and records their disclosed funding history round by round. This methodology note sets
out the definition applied, the classification scheme, and the rules governing how funding is recorded
and aggregated. Every company entry and every funding round rests on evidence from a named source. The
tracker is a work in progress and is improved continuously.

---

## 1. What counts as a quantum company

### 1.1 The definition

There is no single agreed definition of a quantum company. The boundaries of the sector are genuinely
fuzzy and definitions vary between institutions. The definition below is the one this
tracker applies, drawing on definitions of quantum technology used by NIST and the US National
Quantum Initiative, the European Commission's Quantum Technologies Flagship, the CEN–CENELEC Joint
Technical Committee 22 on Quantum Technologies, and the UK National Quantum Technologies Programme
(Innovate UK / UKRI):

> A **quantum company** is a company whose core products, services, components or R&D materially
> develop, commercialise, integrate or enable technologies that exploit quantum physics to achieve
> functions or performance not attainable with classical technologies.

Four areas of activity qualify.

**Core quantum technologies.** Quantum computing and simulation; quantum communication and networking;
quantum key distribution; quantum sensing, imaging, timing and metrology.

**Quantum software and methods.** Companies whose core method is itself a quantum-derived computation,
whether or not it targets a quantum processor. Two families qualify: simulation of quantum-mechanical
systems (ab initio and electronic-structure methods, DFT, QM/MM, coupled cluster, DMRG, FEP, quantum
chemistry and quantum materials modelling); and techniques derived from quantum information science or
quantum many-body physics (quantum and variational-hybrid algorithms, tensor-network and
matrix-product-state methods, quantum-annealing- and coherent-Ising-derived optimisation). The boundary
here is drawn **inclusively and deliberately**: the qualifying feature is the quantum lineage of a
specific, identifiable technique central to the offer, not a demonstrated quantum advantage.

**Quantum-enabling technologies and supply chain.** Specialised components, equipment, infrastructure,
materials and services designed for or supplied to quantum systems – cryogenics, lasers and photonics
supplied to quantum applications, control and readout electronics, quantum-grade materials, foundries
fabricating quantum chips.

**Quantum-safe and post-quantum cryptography.** In scope even though the underlying technology is
classical, provided the offer is explicitly designed to address the security threat created by quantum
computing. Generic cybersecurity without that framing does not qualify.

### 1.2 What does not qualify

A company does not qualify where quantum is a marketing label, an incidental use case, or one item in a
broad advanced-technology association. Generic activity in photonics, AI, cybersecurity, semiconductors,
optics, electronics, cryogenics or materials does not qualify without a clear quantum-specific technical
role.

The decisive line is the **quantum function**, not the underlying physical effect. Every transistor,
laser and LED obeys quantum mechanics, so "depends on a quantum effect" cannot be the test. Qualifying
quantum content lives in one of three places: the active control, readout, generation or transmission of
individual quantum states; a quantum-derived computational method; or a genuine enabling or PQC role.
Reliance on quantum mechanics as the operating principle of an otherwise-classical device or material
does not qualify – and such companies remain out of scope however they brand themselves and whichever
sector lists carry them.

Two worked examples mark the two sides of this line.

**In scope – a quantum-derived method on classical hardware.** A drug- or materials-discovery firm whose
core is first-principles / DFT / QM-MM simulation run on classical HPC, with no quantum processor
involved, is in scope: its product *is* a quantum-derived computation. Classical execution does not
exclude it.

**Out of scope – a first-quantum-revolution material.** A firm manufacturing quantum-dot films for
display backlighting, lighting or anti-counterfeiting inks is out of scope: quantum dots used for their
size-tunable bandgap or bulk photoluminescence are a *material* whose optical property merely originates
in a quantum effect. No individual quantum state is controlled and no quantum-derived method is involved.
By contrast, quantum dots operated as single-photon or entangled-photon sources, or as gate-defined spin
qubits, are core quantum technologies and are in scope.

### 1.3 Entity scope

The definition applies to **standalone companies**. A business unit within a larger group is included
only where it has an independent legal, operational, funding or reporting identity of its own – in
practice a small number of cases, such as China Telecom Quantum Group. Ordinary internal divisions,
product lines, research teams and minor business segments are excluded, and a large diversified
corporation is not included merely because it holds a quantum-related activity somewhere.

**Pure holding and commercialisation vehicles are excluded** unless they develop, productise or deliver
the technology on their own account. Technology-transfer offices, IP-holding and patent-licensing
vehicles, venture studios and incubators are out of scope; holding laboratories, staff or facilities is
not sufficient, because a vehicle that develops technology for onward transfer would otherwise be counted
alongside the spinouts that carry the same technology.

Companies that were once standalone quantum companies and have since become defunct, been absorbed
through acquisition, or been acquired while continuing to operate remain in the tracker, with their
operating status recorded accordingly.

Universities, national laboratories, research institutes, consortia, government programmes, funding
bodies and events are not companies and are out of scope. So are quantum-sector media and
market-intelligence outlets, which report on the ecosystem rather than serving it.

### 1.4 Evidence and sourcing

Sources are consulted in a fixed precedence order:

1. **The company's own product, technology and R&D pages** – not the homepage tagline. Marketing
   "quantum" noise lives on taglines; the technical content lives on product pages.
2. **Curated quantum-sector sources** – recognised public directories of the sector, industry news, and
   national and EU ecosystem lists – used as corroboration rather than primary truth.

Where a source is unavailable this is recorded as absent; inference is never substituted for evidence,
and unfound claims are recorded as not found.

---

## 2. Classification

Companies in scope are classified on **two independent axes**: a *pillar*, recording the technology
domain, and a *stack layer and stream*, recording position in the quantum value chain. The two are
assigned on their own evidence and neither is derived from the other.

### 2.1 Axis 1 – the five pillars

Each company carries exactly one **primary pillar**, the centre of gravity of its offer, plus any
additional pillars that genuinely apply.

| Pillar | Covers |
|---|---|
| **1. Quantum Computing and Simulation** | Quantum computers and quantum simulation, and *all* quantum software and methods – quantum algorithms, quantum chemistry and DFT, quantum optimisation, quantum-information-based methods. |
| **2. Quantum Communication and Networking** | Quantum communication and networking, quantum key distribution, quantum internet and repeaters, quantum random number generation. |
| **3. Quantum Sensing and Metrology** | Quantum sensing, quantum imaging, quantum timing and clocks, quantum metrology. |
| **4. Enabling Technologies** | Components, equipment, infrastructure, materials and services designed for quantum systems – cryogenics, quantum-application lasers and photonics, control electronics, quantum-grade materials, chip foundries. |
| **5. Quantum-Safe Security / PQC** | Quantum-safe and post-quantum cryptography addressing the security threat from quantum computing. |

Companies are classified on the quantum **function**, not the application **domain**. Energy, drug
discovery, materials, finance, logistics and defence are markets a quantum company serves; they are not
pillars.

### 2.2 Axis 2 – stack layer and streams

Each company carries exactly one **stack layer** and one **primary stream**, plus any genuine additional
streams, which may sit in other layers. The primary stream is assigned first, on the evidence; the stack
layer follows from it.

| Stack layer | Streams |
|---|---|
| **Materials & Fabrication** | Semiconductors & Materials · Critical Materials · Foundries & Fabrication |
| **Components & Control** | Control Electronics · Lasers & Optics · Cryogenic Systems · Vacuum Systems · RF & Microwave · Test & Measurement · Cryogenic Supply Chain · Classical Co-processors |
| **Core Quantum Hardware** | Superconducting Qubits · Trapped Ion · Neutral Atom · Photonic Quantum · Silicon Spin Qubits · Topological Qubits · Quantum Annealers · Diamond NV Centers · Emerging Qubit Modalities · Magnetometers · Gravimeters · Atomic Clocks & Timing · Quantum Imaging · Quantum Metrology · QKD Systems · Quantum Memory · Quantum Random Number Generators · Single-Photon & Entangled-Photon Sources · Single-Photon Detectors |
| **Software & Platforms** | Cloud Platforms · Software Development Kits · Algorithms & Compilation · Simulation & Emulation · Error Mitigation & Correction · Hybrid Middleware & Orchestration · Quantum-HPC Integration · Variational Hybrid Algorithms |
| **Applications & Services** | Quantum Finance · Drug Discovery & Pharma · Quantum Chemistry · AI & Machine Learning · Cryptography & Security · Optimisation & Logistics · Automotive & Manufacturing · Energy & Sustainability · Quantum Internet · Consulting / Education & Training |
| **Full Stack** | Drawn from across the layers spanned – see 2.3 |

The layer follows from what a company's core offer is, not from who its customers are: a supplier of
components, materials or fabrication services to quantum systems takes the layer its own product sits in,
even though the machines it feeds are built by others. Software follows the same principle and takes the
software layer whether it is sold to end users or to the hardware makers themselves.

Streams record what a company technically **is**, not the markets it serves. An Applications & Services
stream applies only where the company productises that domain as its actual offer, not to an algorithms
or hardware firm that merely sells into those sectors.

### 2.3 Full Stack

**Full Stack** is used only where a company controls its own quantum stack end to end, building all three
of: **(i)** the qubit platform; **(ii)** the control and readout layer that operates it; and **(iii)** the
user-facing software layer through which the machine is programmed or accessed – compiler, SDK, operating
system or cloud service.

The label follows the sector's own use of the term and is applied strictly. A company describing itself
as full stack does not settle the question: the label is assigned only where all three elements are
evidenced.

- **Applications and services are not part of the test.** Selling an end application does not make a
  company full stack, and lacking one does not disqualify it.
- **Full Stack is computing-specific.** It requires an actual qubit platform, so it does not apply to
  QKD, QRNG, sensing or PQC companies however vertically integrated they are. Breadth across *pillars* is
  breadth of domain, not depth of stack, and never promotes the layer.
- **Integrators and partner-hardware platforms are excluded.** A firm assembling third-party QPUs,
  control racks and cryostats into turnkey systems, or running a cloud over partner QPUs, owns no qubit
  platform and takes Core Quantum Hardware or Software & Platforms respectively.

On limb (ii), a company owns the control and readout layer where it **designs and operates the chain that
drives its own qubits** – signal generation and pulse shaping, measurement and readout, and the
calibration coupling them to the qubit platform – even where individual instruments in that chain are
bought in, since essentially every platform buys its lasers and cryogenics. It does not own limb (ii)
where the control layer is a third-party instrument suite operated as delivered, or where the qubits
themselves are someone else's.

---

## 3. Funding

The tracker records every disclosed funding round for each company in scope, harmonising heterogeneous
source labels into a consistent set of round types, aggregated funding stages and financing instruments.
The aggregation follows the deal-type harmonisation logic of the OECD Start-ups Database and the OECD/EPO
quantum ecosystem report, adapted to the round-type vocabulary used here. All values are in nominal USD.

### 3.1 What is recorded, and what is not

A funding round is recorded where a source describes it as **capital raised by the company** – an
investment, a loan or other financing – **or as public funding**. Procurement contracts, customer contracts, bookings, cloud partnerships, commercial
agreements and service contracts are **not** funding and are excluded, however large.

**Only new capital reaching the company is recorded.** Secondary transactions – purchases of existing
shares that transfer ownership without new money reaching the company – are excluded. What the tracker
measures is capital available to the company for its own operations.

**Public R&D funding is judged by economic purpose, not legal form.** Non-dilutive public support for
research, development and demonstration counts as a grant whether the awarding body delivers it as a
grant or as a contract – US SBIR Phase I and II awards are the clearest case, financing a firm's research
and development without requiring it to give up equity. The test is whether public money is financing
research and technology development, or paying for the purchase, testing or delivery of an already
developed product or service. The latter is procurement or demand-side support rather than direct public
R&D funding, and is treated as company revenue.

**Project-level public grants are excluded** unless the company was the clear sole or primary recipient, or a
company-specific amount was available. Where a public funding package contains both grant and equity
components and the amounts can be distinguished, they are recorded as separate rows.

**In-house quantum spending by large corporations is out of scope.** Where a corporation invests in a
quantum company, that round is recorded like any other. What the tracker does not measure is what large
established companies spend on their own internal quantum programmes: most disclose very little of it, so
any series would be anecdotal and sporadic rather than systematic. Company funding in the tracker
therefore means **capital raised by the quantum companies themselves**.

Rounds are sourced from official company press releases, investor announcements, regulatory and
securities filings (SEC and Form D filings in the US, and their equivalents in other
jurisdictions), government grant pages and reputable news reporting. Private-market databases are not
used as a source for funding data.

**Public funding is also searched systematically, not only company by company.** Award portals publish
months after money is committed, so news and company announcements catch only part of it. Alongside the
per-company search, the full company roster is matched each quarter against bulk government award
datasets, and the resulting candidates are reviewed by hand before entry. This covers the US (SBIR and
STTR), the UK (Innovate UK and Gateway to Research), the EU (CORDIS, for both Horizon 2020 and Horizon
Europe), France (ANR and France 2030), Canada, Sweden, the Netherlands, Finland and Australia.

### 3.2 Round type, funding stage and financing instrument

Each round carries three classifications, in increasing order of aggregation. **Round type** preserves
the source label where it is informative, drawn from a closed vocabulary of approved labels.
**Aggregated funding stage** groups those labels into seven analytically useful categories.
**Financing instrument** collapses them further into four.

| Round types | Aggregated funding stage | Financing instrument |
|---|---|---|
| **Accelerator, Angel and Angel+, Founder investment, Pre-Seed, Seed and Seed+** | Seed and Angel | VC / private equity |
| **Series A and Series B and their variants, Pre-Series A and Pre-Series B and their variants, Early-stage equity** | Early-stage equity | VC / private equity |
| **Series C, Series D, Series E and later, and their variants, Late-stage equity** | Late-stage equity | VC / private equity |
| **Growth equity** – rounds explicitly described as growth equity or growth financing | Growth equity | VC / private equity |
| **Convertible, Convertible loan, Convertible note, Corporate investment, Equity, VC, Private placement, Joint venture** | *Amount-based* | VC / private equity |
| **IPO, SPAC merger, PIPE, Post-IPO equity, Post-IPO convertible, Post-IPO private placement** | Public equity | Public equity |
| **Debt financing, Post-IPO debt** | Debt | Debt |
| **Grant** – non-repayable public funding only | Grant | Grant |

Private-company equity and equity-linked rounds are all *VC / private equity*, including convertible
notes issued while private. IPO-related and listed-company financing is *Public equity*, which is why a
listed-company placement is recorded as a Post-IPO private placement rather than as a private placement.
Post-IPO debt sits under *Debt*, because the instrument is debt whatever the listing status.

The eight round types marked **Amount-based** do not themselves identify a stage. For these the OECD
amount-based rule assigns it:

| Round amount | Aggregated funding stage |
|---|---|
| < USD 3 million | Seed and Angel |
| USD 3–15 million | Early-stage equity |
| > USD 15 million | Late-stage equity |

The rule applies only to those eight round types and **never overrides a named stage**: Series A remains
Early-stage equity and Series C remains Late-stage equity regardless of amount. Joint ventures are
recorded only where the source reports a capital contribution or equity commitment.

### 3.3 Conventions and caveats

**Conversion to USD.** Where an amount is not reported in USD, the contemporaneous USD value given in the
official source is used. Where the source gives none, the amount is converted at the average annual
exchange rate for the year of the round, taken from exchange-rates.org.

**Grant coverage is uneven, and the unevenness is in the data.** The jurisdictions listed above are
covered because they publish recipient-level awards with amounts, not because they are the largest
funders: quantum activity and grant transparency barely correlate. Germany's Förderkatalog holds both
recipient names and amounts but offers no export of any kind, which makes it the single largest gap;
Japan, South Korea, Israel, Switzerland, Singapore and India are all significant public funders of
quantum research that publish no usable recipient-level file. Public funding to companies based in those
countries is therefore likely understated.

**Chinese sources are thinner, so the recorded figures are conservative.** No equivalent award dataset exists in any
form, so public funding to Chinese companies is read directly from annual reports and IPO prospectuses,
which disclose government subsidies as an audited line item. Chinese sources also frequently report equity rounds as a
magnitude rather than a figure – "tens of millions" or "hundreds of millions" of yuan – and where that is
all that is disclosed, a conservative floor is recorded: CNY 20 million for tens of millions, and CNY 200
million for hundreds of millions. Chinese funding totals in the tracker are therefore likely to
understate the actual amounts.

---

## References

Berger, M., Calligaris, S., Dechezleprêtre, A., Dernis, H., Greppi, A., Kirpichev, D., & Muñoz Alvarado,
A. (2026). *The OECD Start-ups Database: A new lens on the global entrepreneurial ecosystems.* OECD
Science, Technology and Industry Working Papers, No. 2026/04. OECD Publishing.
https://doi.org/10.1787/be8e5317-en

CEN/CENELEC JTC 22 Quantum Technologies. (2025). *Standardization Roadmap on Quantum Technologies,
Release 1.1.* CEN-CENELEC.
https://www.cencenelec.eu/media/CEN-CENELEC/AreasOfWork/CEN-CENELEC_Topics/Quantum%20technologies/Documentation%20and%20Materials/fgqt_q06_standardizationroadmapquantumtechnologies_release1-1.pdf

National Institute of Standards and Technology. *Quantum information science.*
https://www.nist.gov/quantum-information-science

National Quantum Initiative. *About the National Quantum Initiative.* https://www.quantum.gov/about/

OECD and European Patent Office. (2025). *Mapping the global quantum ecosystem: A comprehensive analysis
based on innovation, firm, investment, skills, trade and policy data.* OECD and European Patent Office.

Quantum Flagship. *Strategic Research and Industry Agenda 2030.* European Commission.
https://qt.eu/about-quantum-flagship/strategic-research-and-industry-agenda-2030

UK National Quantum Technologies Programme (UKRI). https://uknqt.ukri.org/

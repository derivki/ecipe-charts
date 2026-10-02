# Methodology

The tracker records companies whose core activity is quantum technology, classifies each on two
independent axes, and records their disclosed funding history round by round. This methodology note sets
out the definition applied, the classification scheme, and the rules governing how funding is recorded
and aggregated. Every company entry and every funding round rests on evidence from a named source. The
tracker is a work in progress and is improved continuously. Public funding for quantum technologies,
which is measured separately from company funding, is covered in the second part of this document.

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

---

# Methodology – Public Funding for Quantum Technologies

Public funding for quantum technologies is analysed for countries globally, with the aim of providing a transparent picture of the scale and form of public support while retaining enough detail to understand what sits behind each country's figure. Rather than relying on headline estimates, the analysis works from the underlying funding measures. Each observation is recorded separately, together with the original amount, currency, funding period, funding status, type of support, public authority or origin, USD equivalent, source, and any relevant note on overlap or comparability.

This matters because there is no common international accounting system for public spending on quantum technologies. Governments organise and disclose their support in very different ways. Some announce a single national strategy with a clear multi-year budget. Others distribute funding through research councils, ministries, public laboratories, regional governments, infrastructure programmes or public investment institutions. In some countries, important parts of the public effort are not separately disclosed at all. The analysis therefore follows an evidence-based approach centred on identifiable public funding. In practical terms, a funding amount is included where it can be linked to a sufficiently specific public commitment and where its relationship with other included amounts can be understood well enough to avoid obvious double counting.

The objective is to measure what can be observed, attributed and verified, rather than to fill gaps with assumptions. The present dataset reflects information verified up to 29 September 2026 and covers 36 jurisdictions, including the EU as a separate supranational jurisdiction.

## Core and Additional funding

For analytical purposes, funding is divided into Core and Additional funding.

**Core funding** captures the principal public quantum effort of a jurisdiction. It generally consists of the main national or federal programmes, major research funding streams, national infrastructure investments and other central funding lines that together form the country's principal identifiable quantum effort.

**Additional funding** captures public support that sits outside this main funding architecture. This includes state and regional programmes, stand-alone grants and projects, later programme additions, supplementary infrastructure, and public equity, loans or other investment capital.

## 1. What counts as public quantum funding?

There is no internationally harmonised definition of public investment in quantum technologies. Depending on the country, "quantum funding" can refer to research grants, industrial programmes, infrastructure, public procurement, national laboratories, equity investments or broad strategic-technology initiatives.

For this dataset, we therefore use the following operational definition: *"Public quantum funding is an identifiable financial amount attributable to a government, public authority, public research body, public financial institution or supranational public programme, where the funded activity is specifically related to quantum technologies or where a quantum-specific component can be identified separately."* The word *identifiable* is important.

A government may identify quantum technology as a strategic priority without attaching a specific amount of funding to it. Likewise, a large strategic-technology programme may cover quantum alongside AI, semiconductors, biotechnology or other technologies. Neither case is automatically treated as quantum funding.

Where a broader programme contains a clearly identifiable quantum component, that component can be included. Where no defensible quantum-specific amount can be separated, the broader envelope is not attributed to quantum.

This approach inevitably favours traceability over completeness. In some countries, the amount recorded in the dataset may therefore be lower than the true scale of government support simply because less of that support is publicly observable.

### 1.1 Types of public funding

The dataset distinguishes five forms of public support:

| Funding type | What it covers |
|---|---|
| National / regional programme | National strategies, missions, action plans, multi-year programme envelopes and regional quantum programmes. |
| Research / innovation funding | Government-awarded research grants, public R&D programmes, agency awards, competitive calls and similar support for scientific or technological development. |
| Infrastructure / public procurement | Laboratories, quantum computers, communications networks, testbeds, research facilities and other identifiable publicly financed quantum infrastructure. |
| Public equity / loan / investment | Equity investments, public loans, convertible financing and other capital supplied by public financial institutions or publicly controlled investment vehicles. |
| Other quantum-specific public funding | Identifiable public support that does not fit naturally within the other categories. |

These categories are kept separate because they represent different forms of government intervention. A research grant, an infrastructure programme and a public equity investment are not economically identical, even though each represents public resources directed towards quantum technologies.

## 2. Which public authorities are included?

Public support for quantum technologies is not confined to the central government. Depending on the country, funding may come from ministries, research councils, public laboratories, state or provincial governments, national development banks, publicly owned investment institutions or supranational programmes. The dataset therefore records the public origin of each observation separately. This allows country totals to reflect the fact that public quantum funding may come from several levels of government. It also avoids treating "government funding" as synonymous with central-government budget expenditure.

Where states, provinces or regional governments make identifiable quantum-specific commitments, those amounts can be included. In the dataset, such funding generally falls under Additional funding because it supplements the principal national or federal effort.

The same principle applies to publicly controlled financial institutions. Their equity investments, loans or similar forms of financial support can be included where the public contribution itself can be identified.

## 3. What does the total actually measure?

A central feature of the dataset is that it does not measure cash expenditure alone. Public funding moves through several stages. A programme may be announced, approved, allocated, awarded, contracted and ultimately disbursed. Governments do not all disclose information at the same stage, and in some cases the only publicly available figure is the value of an approved or announced multi-year commitment.

The dataset therefore contains a range of funding statuses: realised or spent funding, awarded or contracted funding, allocations, budget appropriations, commitments, approved investments, announced programmes, planned expenditure, pending allocations and requested budget authority. The funding status remains visible for every observation. As a result, the headline country figure should be understood as the stock of identifiable public funding and funding commitments recorded in the dataset. It is not equivalent to cumulative cash expenditure already disbursed.

This distinction is particularly important when comparing countries. One government may publish the full value of a ten-year quantum strategy at the moment it is announced, while another may disclose only annual expenditure. Both amounts can be valid observations, but they represent different stages and different time horizons.

The underlying dataset makes it possible to construct narrower measures where needed. For example, users can focus only on realised expenditure, only on awarded or allocated funding, or exclude planned and requested amounts. For this reason, the most accurate general description of the headline figures is *identified public funding and funding commitments for quantum technologies*, rather than simply "government spending".

## 4. Different funding periods and time horizons

The observations in the dataset cover different periods. Some represent a single project or one year of government spending. Others capture cumulative expenditure over several years, while national strategies can cover five, ten or even more years.

Country totals should therefore not be interpreted as annual spending rates. A ten-year public commitment will naturally produce a larger headline amount than one year of expenditure, even if annual spending under the programme is much smaller. Where the relevant period is available, it is retained in the dataset. This allows users to distinguish between historical expenditure, annual budgets and future multi-year commitments. The country figures are best understood as stocks of identifiable public funding commitments across the periods covered by the underlying observations.

## 5. Inclusion and exclusion principles

### 5.1 A quantum-specific amount must be identifiable

An observation is included where a monetary amount can be identified and the activity is sufficiently related to quantum technologies. Where a programme supports several technologies, the entire amount is not normally attributed to quantum unless the quantum component can be separated. This is particularly relevant for large technology funds covering combinations of quantum, artificial intelligence, semiconductors, advanced computing, hydrogen, biotechnology and other emerging technologies. Counting the full value of such a programme as quantum funding would systematically overstate the public effort. Where the quantum share cannot be identified, the broader amount is therefore excluded.

### 5.2 Public rather than private funding

Private corporate expenditure and philanthropic funding fall outside the scope of the dataset. This remains the case even when such expenditure plays an important role in a country's wider quantum ecosystem. Public capital provided through a publicly controlled investment institution can, however, be included when the value of the public contribution is identifiable.

This includes public equity, loans and similar forms of financing. These instruments are recorded at their nominal public commitment value but remain separately classified. This matters because a US$100 million public loan or equity investment is not economically identical to a US$100 million grant, even though both represent US$100 million of public capital directed towards quantum activity. Keeping these instruments separate allows users to exclude repayable finance or public investment where a narrower grant-based comparison is desired.

### 5.3 Announced and future funding

Funding does not need to have been fully spent before it can be included. An announced, planned, requested or future amount can enter the dataset where:

- a specific monetary value is publicly identified;
- the amount can be attributed to a public authority or institution;
- the activity is sufficiently quantum-specific; and
- the funding is not already contained within another included figure.

Its status must, however, remain visible. This makes it possible to capture meaningful government commitments without implying that every included amount has already been spent.

## 6. Evidence and sources

The aim is to use the strongest available evidence for each observation. Where possible, priority is given to official budget documents, legislation, government appropriations, ministries, public agencies, public research institutions and programme administrators. Public financial institutions are also used where they are the source of the relevant investment or financing commitment.

Where official budget information is incomplete, secondary sources are used as an additional source, particularly where they reconstruct historical government expenditure from underlying programme information. Secondary databases, industry sources and ecosystem estimates can help identify programmes that warrant further investigation, but a widely cited headline figure is not automatically accepted simply because it is repeated across several publications. What matters is whether the amount can be traced back to a sufficiently clear public funding commitment and whether it can be added without creating an obvious overlap with other funding already included. This distinction is particularly important for China, where several large headline estimates circulate internationally but cannot be reconciled with a transparent underlying budget breakdown.

## 7. Avoiding double counting

Avoiding double counting is one of the most important parts of the methodology. Government programmes are often reported at several levels. A national strategy may contain a set of programmes, which in turn contain individual awards or infrastructure projects. Later government announcements may highlight one component of an earlier programme without making clear that the money was already part of the original envelope. Adding each of these figures together would exaggerate the scale of public funding.

Overlap is therefore assessed at the level of the individual observation. Where a sub-programme is demonstrably contained within a larger included programme, it is not added again. A later programme can be included separately where the source makes clear that it represents additional funding. Likewise, annual awards are not added on top of an aggregate programme figure where the aggregate already contains those awards.

The same reasoning applies to co-financing. Where a project combines national, regional, EU or private contributions, only the identifiable public contribution of the relevant authority is attributed to that jurisdiction. Total project cost is not automatically treated as public funding. Where more than one public authority funds the same project, the contribution of each authority is separated where possible.

There are also cases in which potential overlap cannot be resolved perfectly. Rather than making an unsupported assumption, these cases are retained with an explicit note describing the uncertainty. The same principle applies across time. A historical cumulative amount and a later multi-year strategy are added together only when their periods and scope can reasonably be distinguished.

## 8. Treatment of EU funding

The EU is treated as a separate supranational jurisdiction. This is necessary because EU programmes constitute genuine public quantum funding, but EU resources also flow to projects located in Member States that are themselves included individually in the dataset. The EU figure should therefore not simply be added to Member-State totals when constructing an aggregate for European countries.

The final calculations distinguish between the total including the EU row for reference and the total excluding the EU row. In the current workbook, the sum including the EU is US$41.94 billion. Excluding the EU row, the corresponding total is US$39.08 billion, while the separate EU total is US$2.86 billion.

For cross-country aggregation, the figure excluding the EU is preferable because it reduces the risk of counting the same European public resources once at EU level and again in the Member State where the funding is implemented.

Where a nationally implemented project includes an identifiable national co-financing contribution alongside EU funding, only that national share is attributed to the country.

## 9. Currency conversion

All funding amounts are retained in their original currencies and converted into nominal US dollars for comparison.

The basic calculation is: *USD equivalent = amount in original currency × USD per unit of original currency.* The Rates sheet records the exchange rates applied to the relevant observations. Most amounts use the calendar-year average exchange rate corresponding to the funding or reference year.

For observations using 2026 as the relevant conversion year, the dataset applies the 2026 year-to-date average available at the September 2026 cut-off. Older 31 December 2025 proxy rates remain visible in the Rates sheet for audit purposes where relevant, but are marked as deprecated when they are no longer applied. Amounts that are reported directly in US dollars in the original source are retained as USD-native observations and therefore use an exchange rate of 1.

The dataset is nominal. Historical amounts are not adjusted for inflation, and purchasing-power-parity exchange rates are not used. Converting all observations into US dollars therefore creates a common nominal unit, but it does not eliminate differences in domestic purchasing power or changes in the real value of money over time.

## 10. China: why the recorded figure is approximately US$2 billion

China requires a particular explanation because the available public evidence is significantly less complete than the scale of the country's quantum ambitions would suggest.

There is substantial evidence that quantum technology has received high-level strategic priority in China. What is much harder to establish is the total amount of public funding attached to that effort. For this reason, the Chinese figure is constructed from the bottom up rather than beginning with one of the widely circulated headline estimates. Only amounts that can be linked to sufficiently specific programmes or infrastructure investments are included.

### 10.1 Public funding up to 2019

For the period up to 2019, the dataset relies on the reconstruction by Zhang et al. (2019), co-authored by Pan Jian-Wei. The study provides one of the most detailed publicly available accounts of Chinese government support for quantum communication, quantum computing and quantum metrology over the preceding two decades.

It identifies four funding periods:

- US$10 million for 1998–2006;
- US$150 million during the 11th Five-Year Plan, 2006–2010;
- US$490 million during the 12th Five-Year Plan, 2011–2015; and
- US$337 million during the 13th Five-Year Plan up to 2019.

Together, these amount to US$987 million.

The dataset records the four underlying periods separately. The US$987 million cumulative figure is therefore a check on those components rather than an additional amount added to the Chinese total.

### 10.2 The Hefei National Laboratory

A second identifiable component is the CNY7 billion first-phase infrastructure envelope for the National Laboratory for Quantum Information Sciences in Hefei. Using the exchange rate applied in the workbook, this corresponds to approximately US$1.0115 billion. The Hefei amount is kept separate from the Zhang et al. estimates because it concerns a specific infrastructure programme, whereas the Zhang reconstruction relates primarily to government research and programme funding.

The publicly available evidence does not establish that the CNY7 billion construction envelope was already included in the Zhang et al. figures. At the same time, the available Chinese public accounts are not detailed enough to rule out every possible overlap with absolute certainty. The two are therefore treated as separately identifiable streams while this residual uncertainty remains explicitly recognised.

The Chinese total currently recorded in the dataset is consequently US$987 million + US$1.0115 billion = US$1.9985 billion, or approximately US$2.0 billion.

### 10.3 What the US$2 billion figure means

The approximately US$2 billion figure should not be interpreted as an estimate of everything the Chinese government has spent or committed to quantum technologies. It represents the amount that can presently be reconstructed from specific funding observations that satisfy the same basic requirements of identifiability, sourcing and overlap control applied across the dataset.

The most accurate description is therefore: *approximately US$2 billion in identified and traceable Chinese public quantum funding.* It should not be described simply as China's total public investment in quantum. This distinction is particularly important because there are several known Chinese funding channels for which no sufficiently reliable quantum-specific amount can currently be established.

### 10.4 Why the picture becomes less complete after 2019

The observable funding series becomes substantially less complete after 2019. The programmes identified by Zhang et al. do not provide a continuous public funding series through the 14th Five-Year Plan.

During the subsequent period, an important part of the national effort moved towards the Sci-Tech Innovation 2030 "Quantum Communication and Quantum Computer" megaproject. Its aggregate budget is not publicly disclosed. Some post-2019 funding can still be observed through NSFC grants, National Key R&D Programme projects and other identifiable programmes. These, however, capture only part of the overall national effort. The absence of a large identifiable post-2019 amount should therefore not be interpreted as an absence of Chinese public funding.

Funding in 2020 and subsequent years is included only where a separate monetary amount can be verified. In other words, the post-2019 gap in the dataset is primarily an information gap.

### 10.5 Why this differs from earlier US$4 billion and US$15 billion figures

Previous discussions of Chinese public quantum funding have cited substantially larger figures. The best-known headline estimate is approximately US$15 billion. The approximately US$4 billion figure was an external aggregate estimate used to illustrate the unusually large uncertainty surrounding Chinese public funding. It was not derived from the bottom-up programme reconstruction used here.

The present analysis asks a narrower question: how much Chinese public quantum funding can be linked to identifiable monetary amounts that satisfy the dataset's sourcing, specificity and double-counting rules? On the evidence currently available, that figure is approximately US$2 billion. Where a gap cannot be supported by identifiable funding evidence, it remains a gap rather than being filled by assumption.

## 11. The Anhui quantum-industry fund

A specific issue concerns the CNY10 billion quantum-industry development fund associated with Anhui Province. Public reporting around the development of the Hefei quantum ecosystem refers to this fund in addition to the CNY7 billion first-phase laboratory infrastructure envelope. The distinction is potentially important because CNY10 billion would represent a material addition to China's identifiable funding if it were shown to be a fully public, quantum-specific commitment that is genuinely additional to the laboratory funding. However, the announced size of an investment fund is not necessarily the same as the amount of public money that has actually been committed or deployed.

For this reason, the dataset distinguishes between the headline target size of a fund, the public capital actually committed to it, and the amount ultimately invested in qualifying quantum activities.

The CNY10 billion amount is therefore not automatically added to the Chinese total. Before doing so, it would be necessary to establish that:

- the amount represents identifiable public capital;
- the fund is sufficiently quantum-specific;
- the money is genuinely additional to the CNY7 billion laboratory envelope; and
- the figure represents more than an aspirational fund size.

Until those points can be established, the amount remains outside the headline total rather than being treated as public quantum funding at face value.

This is a deliberate choice. It avoids both ignoring the existence of the fund and overstating Chinese funding by treating an announced fund size as equivalent to verified public expenditure or commitment.

## 12. How to interpret cross-country comparisons

The analysis attempts to improve transparency across countries, but it cannot remove all differences in the way governments report public funding. Three issues are especially important.

**First, disclosure differs significantly.** Some governments publish detailed budgets and project-level awards. Others provide only broad programme envelopes or limited information. A lower recorded figure can therefore reflect weaker transparency as well as genuinely lower levels of funding.

**Second, countries organise their funding differently.** One jurisdiction may appear in the dataset through a single large national programme, while another appears through many individual grants and infrastructure projects. The number of observations therefore says little by itself about the overall scale of public support.

**Third, funding status and timing differ.** An amount already spent and an amount committed for future years may both be included, but they are not economically identical. Likewise, a ten-year programme envelope cannot be interpreted as equivalent to one year of government expenditure.

The headline figures are therefore best suited to comparing the scale of identifiable public funding and commitments. More specific questions, such as actual historical expenditure, grants alone, national-government funding only, or realised spending, require narrower cuts of the underlying data.

## 13. How the figures should be described

The preferred description of the headline measure is: *Identified public funding and funding commitments for quantum technologies.* A shorter formulation such as *identified public quantum funding* can also be used where space is limited.

Unless a narrower subset of the dataset is being used, the figures should not generally be described as:

- total government expenditure;
- annual government spending;
- total national quantum investment; or
- cumulative cash disbursements.

For China in particular, figures and charts should make clear that the approximately US$2 billion figure represents identified and traceable public funding and does not capture several important post-2019 funding channels whose monetary value cannot be established from available public information.

## 14. Issues to keep in mind when interpreting the results

There are several areas where the figures require particular care.

**China.** Its approximately US$2 billion figure is not a comprehensive national total. Significant post-2019 funding channels remain outside the dataset because they cannot be quantified reliably.

**The Hefei laboratory and the Anhui fund.** The CNY7 billion Hefei amount should be described according to the evidence supporting it. If the source establishes a planned first-phase infrastructure envelope rather than full expenditure, the funding status should reflect that distinction. The CNY10 billion Anhui fund also remains important. It should be added only if its public contribution, quantum specificity, funding status and relationship to the CNY7 billion laboratory investment can be established. Otherwise, its exclusion should remain explicit. There is also residual uncertainty over potential overlap between the Hefei infrastructure funding and the programme estimates reported by Zhang et al. The available evidence suggests that they represent different funding channels, but Chinese public reporting does not allow all overlap risk to be eliminated completely.

**Commitments versus expenditure.** Public funding commitments should not be confused with actual cash expenditure. The dataset deliberately includes both realised and future funding, with their different statuses retained.

**Loans and equity.** Public loans and equity represent public capital committed to quantum technologies but are not economically equivalent to grants.

**Rankings.** Differences in transparency mean that country rankings should not be interpreted as perfect measures of the underlying level of government support. Some countries may have important public funding that is simply less observable.

The most important limitation of the analysis is that public visibility differs substantially across countries. The absence of a funding observation does not necessarily mean that no public funding exists. This is particularly relevant where government R&D budgets are not published at technology level, where military or security programmes are involved, where public enterprises invest without reporting the activity as government expenditure, where large funds cover several technologies, or where sub-national programmes are difficult to identify systematically. The dataset therefore does not provide a complete census of global government spending on quantum technologies.

Each included observation is linked to a specific funding amount, programme, funding status, public origin and source, together with a note on overlap where relevant. This makes it possible to understand what sits behind each country figure and, where new evidence emerges, to revise individual observations without changing the basic methodological approach.

These limitations define the scope of the comparison rather than invalidate it. The dataset is intended to show, as transparently as possible, how much public quantum funding can be identified from available evidence, what form that support takes, and how confidently it can be attributed without double counting.

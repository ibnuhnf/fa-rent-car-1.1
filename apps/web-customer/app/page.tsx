import { BottomTabBar, Brand, ButtonLink, Card, Icon } from '@fa/ui';

import { HeroSearchCard } from './hero-search-card';

const WHATSAPP_NUMBER = '6285224484488';

const whatsappAdminUrl =
  'https://wa.me/6285224484488?text=Halo%20FA%20RENT%20CAR%2C%20saya%20ingin%20menanyakan%20ketersediaan%20mobil.';

const whatsappConsultUrl =
  'https://wa.me/6285224484488?text=Halo%20FA%20RENT%20CAR%2C%20saya%20ingin%20konsultasi%20sewa%20mobil%20bulanan%20atau%20rombongan.';

const navItems = [
  { label: 'Beranda', href: '#beranda', active: true },
  { label: 'Katalog Armada', href: '#armada' },
  { label: 'Tata Cara Sewa', href: '#tata-cara' },
  { label: 'Cek Status', href: '#cek-status' },
  { label: 'Kontak & Bantuan', href: '#kontak' },
];

const fleet = [
  {
    id: 'innova-zenix',
    name: 'Toyota Innova Zenix Hybrid',
    variant: 'Tipe 2.0 V Modellista (NIK 2024)',
    price: 'Rp 750.000',
    tags: [
      { label: 'Terpopuler Keluarga', tone: 'accent' as const },
      { label: 'Bensin Hybrid', tone: 'muted' as const },
      { label: 'Matic 7 Seater', tone: 'muted' as const },
    ],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCFByHAJOHAEWNn8GcvqHXX9FYgdmRPr23aa-yYsXeV9N8pnSrJohRA0JXgn85vMGIxFFVqBTcAKyj7hhEA-oC2UR1LB3aEuQXVLSUlYXyeUxmArXaYPtaf_0xmGYZThVcuN4ZFjvKB_AOktmSx30tj9pIHHkg24cGJ1vgorzUfQedXS0dWvpWvGgjIdqgxeYWwCPLW-vF2stin59EZ5O7YLzN70SK4ZAQTCFES1iwijTzmdhzxfJBU',
    imageAlt:
      'Toyota Innova Zenix Hybrid putih, tampak tiga per empat depan, kondisi mulus di studio.',
    specs: [
      { icon: 'speed', text: '24.120 km' },
      { icon: 'airline_seat_recline_normal', text: '7 Kursi Kapten' },
      { icon: 'luggage', text: 'Muat 4 Koper' },
      { icon: 'ac_unit', text: 'AC Double Blower' },
    ],
  },
  {
    id: 'bmw-e46',
    name: 'BMW E46 325i Motorsport',
    variant: 'Classic Executive Line (Individual Trim)',
    price: 'Rp 850.000',
    tags: [
      { label: 'Classic Enthusiast', tone: 'dark' as const },
      { label: 'Enam Silinder M54', tone: 'muted' as const },
      { label: 'Matic 5 Seater', tone: 'muted' as const },
    ],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCgviJ8CiAS6zy6I4errTq3MWtGkSgMmZf_AafidNz-72mZGZI50EnGqKJzPKHJNFo_CIJs9EmP6NruE9bzrpLTBJKLEqcNyNny258SPtZGh5RqyVgyLFUTDVCNv4e1qUmDLGTSa9EMPxJam77q4hxeK5L7tfWFETReM45NS_vZKp4niBg9zkTsUEidNtn73soM3fOoeGAR-CxzQ7NMMe3yQ20_1khtrJklGO4as719eGI6T0xi7JA3',
    imageAlt: 'BMW E46 325i Motorsport silver klasik di showroom beton, velg alloy BBS.',
    specs: [
      { icon: 'speed', text: 'Kondisi Mint 37.000 km' },
      { icon: 'volume_down', text: 'Knalpot Halus Ori' },
      { icon: 'menu_book', text: 'Service Astra Lengkap' },
      { icon: 'airline_seat_recline_normal', text: 'Kulit Asli Napa' },
    ],
  },
  {
    id: 'fortuner-vrz',
    name: 'Toyota Fortuner 2.8 VRZ',
    variant: '4x2 GR Sport Package (NIK 2023)',
    price: 'Rp 1.500.000',
    tags: [
      { label: 'SUV Tangguh', tone: 'strong' as const },
      { label: 'Diesel 2.8 Turbo', tone: 'muted' as const },
      { label: 'Matic 7 Seater', tone: 'muted' as const },
    ],
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCStWlBnfzfGkdIPRAIeQCN15fOP-tYULjge7wVSBfBKHGn5JJj6XBGKYX_1BKp54bQl8JmFSY87c7NaREST1Jq11PXOT9NK8XmaXbdyjOnUpNv8w_CNWWNS3d7g5tK390IzBh8afno-YtcToY6PKjfcjMzRXsocg5RHPXYpI7feruNPP0JNZ39OHhWCL37272i094BAyu45-jZDGDzcbnAm9uJ5fm-HrjaTeX2dG5BQQuZDLe_Gdjf',
    imageAlt: 'Toyota Fortuner 2.8 VRZ GR Sport hitam di jalan aspal perkotaan, grille agresif.',
    specs: [
      { icon: 'speed', text: '31.500 km' },
      { icon: 'height', text: 'High Ground Clearance' },
      { icon: 'videocam', text: 'Kamera 360 & Sensor' },
      { icon: 'toys', text: 'Torsi 500 Nm Mantap' },
    ],
  },
];

const tagClasses = {
  accent: 'bg-secondary text-surface-lowest',
  dark: 'bg-primary text-surface-lowest',
  strong: 'bg-surface-high text-on-surface',
  muted: 'bg-surface-low text-on-surface-variant',
} as const;

const steps = [
  {
    title: 'Pilih Mobil & Tanggal',
    description:
      'Lihat ketersediaan riil armada yang tidak bentrok jadwal sewa lain. Unit yang Anda pilih ditahan selama proses reservasi.',
  },
  {
    title: 'Form Cepat (Tanpa Login)',
    description:
      'Isi nama lengkap, nomor WhatsApp aktif, lalu unggah foto KTP dan SIM. Berkas disimpan terenkripsi.',
  },
  {
    title: 'Terima Invoice Otomatis',
    description:
      'Dapatkan invoice PDF resmi berformat FA-YYYYMMDD-XXX langsung di layar dan tautan status pribadi.',
  },
  {
    title: 'Transfer Bank',
    description:
      'Lunasi 100% biaya sewa ke rekening resmi CV FA RENT CAR dalam 2 jam agar unit tidak kedaluwarsa.',
  },
  {
    title: 'Verifikasi Admin',
    description:
      'Kirim bukti transfer via WhatsApp. Admin memverifikasi dokumen dan pembayaran, status berubah menjadi Aktif.',
  },
  {
    title: 'Serah Terima Kunci',
    description:
      'Ambil mobil di kantor FA RENT CAR dengan checklist inspeksi digital bodi & BBM sebelum tanda tangan.',
  },
];

const policies = [
  {
    icon: 'verified',
    title: 'Garansi Unit Bersih & Prima',
    description:
      'Setiap unit melewati sterilisasi kabin dengan ozon, pencucian detail, dan pemeriksaan mesin berkala agar siap jalan sejak menit pertama.',
    footer: 'Standar Kebersihan & Kelayakan',
  },
  {
    icon: 'shield',
    title: 'Privasi Dokumen KTP & SIM',
    description:
      'Sesuai UU PDP No. 27/2022, file identitas Anda dihapus otomatis 30 hari setelah periode sewa selesai.',
    footer: 'Enkripsi Database Server',
  },
  {
    icon: 'support_agent',
    title: 'Bantuan 24 Jam',
    description:
      'Kantor buka 24 jam. Kendala di jalan? Hubungi admin, kami bantu solusinya.',
    footer: 'Respons Cepat via WhatsApp',
  },
];

function formatPhone(number: string) {
  const digits = number.slice(2);
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

export default function CustomerHomePage() {
  const phoneDisplay = formatPhone(WHATSAPP_NUMBER);

  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-surface-highest bg-surface-lowest/85 shadow-topbar backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-container-max items-center justify-between gap-gutter px-margin-mobile lg:h-[72px] lg:px-gutter">
          <a aria-label="FA RENT CAR, kembali ke beranda" href="#beranda">
            <Brand subtitle="Rental & Mobility" />
          </a>
          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-1 rounded-full bg-surface-low p-1 lg:flex"
          >
            {navItems.map((item) => (
              <a
                aria-current={item.active ? 'page' : undefined}
                className={
                  item.active
                    ? 'rounded-full bg-surface-lowest px-4 py-2 text-body-md font-semibold text-on-surface shadow-card'
                    : 'rounded-full px-4 py-2 text-body-md text-on-surface-variant transition-colors hover:text-on-surface'
                }
                href={item.href}
                key={item.label}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <ButtonLink
              className="hidden xl:inline-flex"
              href={whatsappAdminUrl}
              icon="chat"
              rel="noreferrer"
              target="_blank"
              variant="whatsapp"
            >
              WhatsApp Admin
            </ButtonLink>
            <ButtonLink href="#armada" icon="directions_car">
              Cek Ketersediaan
            </ButtonLink>
            <span
              aria-hidden
              className="ml-1 hidden size-8 shrink-0 items-center justify-center rounded-full bg-primary text-surface-lowest sm:flex"
            >
              <Icon name="person" size="sm" />
            </span>
          </div>
        </div>
      </header>

      <main className="w-full bg-background pt-16 lg:pt-[72px]">
        <section className="w-full bg-surface-lowest pb-16 pt-8" id="beranda">
          <div className="mx-auto flex max-w-container-max flex-col items-center px-margin-mobile lg:px-gutter">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-low px-3 py-1.5 text-on-surface shadow-card">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none"
              />
              <span className="text-label-md font-medium tracking-[0.02em] text-on-surface-variant">
                Inventaris Pool Aktif:{' '}
                <strong className="font-semibold text-on-surface">45 Armada Siap Jalan</strong>
              </span>
            </p>

            <div className="mb-10 flex max-w-4xl flex-col items-center gap-4 text-center">
              <h1 className="font-display text-display-lg tracking-[-0.02em] text-on-surface">
                Sewa Mobil Lepas Kunci &amp; Dengan Sopir di Cirebon
              </h1>
              <p className="max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
                45 armada siap jalan. Cek ketersediaan mobil sesuai tanggal, kalkulasi total tarif
                transparan tanpa biaya siluman, dan pesan langsung tanpa wajib registrasi akun.
              </p>
            </div>

            <HeroSearchCard />
          </div>
        </section>

        <section className="w-full bg-surface pb-8 pt-32">
          <div className="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
            <div className="flex w-full flex-col items-center justify-between gap-3 rounded-card bg-surface-lowest p-4 text-on-surface shadow-card sm:flex-row md:px-6 md:py-3.5">
              <div className="flex items-center gap-3">
                <span aria-hidden className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-secondary" />
                </span>
                <p className="text-body-md text-on-surface">
                  <span className="font-semibold">Status Pool Hari Ini:</span>
                  <span className="ml-1 font-bold text-secondary">
                    18 Unit Tersedia Siap Pakai
                  </span>
                  <span className="mx-1.5 text-on-surface-variant">•</span>
                  <span className="text-on-surface-variant">20 Sedang Jalan</span>
                  <span className="mx-1.5 text-on-surface-variant">•</span>
                  <span className="text-on-surface-variant">7 Perawatan Berkala Rutin</span>
                </p>
              </div>
              <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
                <Icon name="sync" size="sm" />
                Terakhir disinkronkan 12 detik lalu
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="armada-heading" className="w-full bg-surface py-12" id="armada">
          <div className="mx-auto flex max-w-container-max flex-col gap-8 px-margin-mobile lg:px-gutter">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex flex-col gap-1">
                <span className="text-label-md font-semibold uppercase tracking-wider text-secondary">
                  Ready to Roll
                </span>
                <h2
                  className="text-headline-lg-mobile font-bold tracking-[-0.02em] text-on-surface sm:text-headline-lg"
                  id="armada-heading"
                >
                  Armada Pilihan Minggu Ini
                </h2>
                <p className="text-body-md text-on-surface-variant">
                  Semua unit melalui inspeksi berkala, pembersihan kabin, dan AC dingin optimal.
                </p>
              </div>
              <a
                className="inline-flex items-center gap-1.5 text-body-md font-semibold text-secondary transition-colors hover:text-on-secondary-fixed-variant"
                href="#armada"
              >
                Lihat Semua 45 Unit
                <Icon name="arrow_forward" size="sm" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {fleet.map((vehicle) => (
                <article
                  className="group flex h-full w-full flex-col rounded-card border border-surface-highest bg-surface-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
                  key={vehicle.id}
                >
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {vehicle.tags.map((tag) => (
                        <span
                          className={`rounded-full px-2.5 py-1 text-label-md ${tagClasses[tag.tone]}`}
                          key={tag.label}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <div className="relative h-52 w-full overflow-hidden rounded-card bg-surface-low">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={vehicle.imageAlt}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                        loading="lazy"
                        src={vehicle.image}
                      />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-title text-on-surface">{vehicle.name}</h3>
                      <span className="text-caption text-on-surface-variant">
                        {vehicle.variant}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 rounded-card bg-surface-low/50 px-3 py-3">
                      {vehicle.specs.map((spec) => (
                        <div className="flex items-center gap-2 text-on-surface" key={spec.text}>
                          <Icon className="text-secondary" name={spec.icon} size="sm" />
                          <span className="text-body-md">{spec.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-3 border-t border-surface-highest pt-4">
                    <div className="flex flex-col">
                      <span className="text-label-md font-medium uppercase tracking-[0.02em] text-on-surface-variant">
                        Tarif Sewa Harian
                      </span>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-price-lg text-secondary">
                          {vehicle.price}
                        </span>
                        <span className="text-body-md font-medium text-on-surface-variant">
                          / hari
                        </span>
                      </div>
                    </div>
                    <ButtonLink
                      className="w-full"
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                        `Halo FA RENT CAR, saya ingin memesan ${vehicle.name}.`,
                      )}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Pesan Sekarang
                    </ButtonLink>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="tata-cara-heading"
          className="w-full bg-surface-low py-16"
          id="tata-cara"
        >
          <div className="mx-auto flex max-w-container-max flex-col gap-10 px-margin-mobile lg:px-gutter">
            <div className="flex max-w-2xl flex-col gap-2">
              <span className="text-label-md font-semibold uppercase tracking-wider text-secondary">
                Prosedur Ringkas
              </span>
              <h2
                className="text-headline-lg-mobile font-bold tracking-[-0.02em] text-on-surface sm:text-headline-lg"
                id="tata-cara-heading"
              >
                Tata Cara Pemesanan Praktis
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Tanpa registrasi akun. Alur pemesanan jelas, terukur, dan transparan dari awal
                hingga serah terima kunci.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  className="relative flex flex-col gap-3 rounded-card border border-surface-highest bg-surface-lowest p-6 shadow-card"
                  key={step.title}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-headline-md font-bold text-surface-lowest">
                    {index + 1}
                  </span>
                  <h3 className="text-body-lg font-bold text-on-surface">{step.title}</h3>
                  <p className="text-body-md leading-relaxed text-on-surface-variant">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="kebijakan-heading" className="w-full bg-surface py-16">
          <div className="mx-auto flex max-w-container-max flex-col gap-8 px-margin-mobile lg:px-gutter">
            <div className="flex max-w-xl flex-col gap-2">
              <span className="text-label-md font-semibold uppercase tracking-wider text-secondary">
                Integritas Layanan
              </span>
              <h2
                className="text-headline-lg-mobile font-bold tracking-[-0.02em] text-on-surface sm:text-headline-lg"
                id="kebijakan-heading"
              >
                Kebijakan Transparan &amp; Anti-Biaya Siluman
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Komitmen operasional FA RENT CAR menjamin kenyamanan finansial dan hukum setiap
                pelanggan.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
              {policies.map((policy) => (
                <Card className="flex flex-col justify-between" key={policy.title} padding="lg">
                  <div className="flex flex-col gap-4">
                    <span className="flex size-12 items-center justify-center rounded-lg bg-surface-low text-secondary">
                      <Icon name={policy.icon} size="lg" />
                    </span>
                    <h3 className="text-body-lg font-bold text-on-surface">{policy.title}</h3>
                    <p className="text-body-md leading-relaxed text-on-surface-variant">
                      {policy.description}
                    </p>
                  </div>
                  <p className="mt-6 flex items-center gap-2 border-t border-surface-highest pt-3 text-label-md font-semibold text-on-surface">
                    <Icon className="text-secondary" name="check_circle" size="sm" />
                    {policy.footer}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <span aria-hidden id="cek-status" className="block h-0" />
        <section className="w-full bg-surface pb-16" id="kontak">
          <div className="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
            <div className="flex w-full flex-col items-center justify-between gap-6 rounded-cta bg-primary p-6 text-surface-lowest shadow-card-hover lg:flex-row md:p-8">
              <div className="flex max-w-2xl flex-col gap-3 text-left">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-lowest/10 px-3 py-1 text-label-md font-medium text-surface-lowest">
                  <Icon className="text-secondary-fixed" name="headset_mic" size="sm" />
                  Layanan Konsultasi
                </span>
                <h2 className="text-headline-md font-bold tracking-[-0.02em] text-surface-lowest">
                  Butuh Sewa Bulanan atau Rombongan?
                </h2>
                <p className="text-body-md leading-relaxed text-surface-highest">
                  Konsultasikan kebutuhan armada, sewa bulanan, atau jadwal rombongan Anda. Tim
                  admin FA RENT CAR aktif membalas dalam hitungan menit via WhatsApp resmi.
                </p>
              </div>
              <ButtonLink
                className="w-full shrink-0 sm:w-auto"
                href={whatsappConsultUrl}
                icon="chat"
                rel="noreferrer"
                size="lg"
                target="_blank"
                variant="whatsapp"
              >
                Chat WhatsApp Admin
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-surface-highest bg-surface-low">
        <div className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-gutter">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-3">
              <Brand subtitle="Rental & Mobility" />
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Layanan sewa mobil terpercaya di Cirebon. Mengutamakan transparansi harga,
                integritas unit terawat, dan standar kenyamanan tanpa kompromi.
              </p>
              <div className="mt-2 flex items-start gap-3 text-on-surface-variant">
                <Icon className="shrink-0 text-primary" name="pin_drop" />
                <p className="text-body-md leading-snug">
                  <span className="block font-semibold text-on-surface">Kantor &amp; Pool</span>
                  Jl. Pilang Raya No.10, Pilangsari, Kedawung, Cirebon
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-body-lg font-bold text-on-surface">Jam Layanan &amp; Darurat</h4>
              <div className="flex flex-col gap-3">
                <div className="rounded-lg bg-surface-lowest p-3">
                  <span className="mb-1 block text-label-md uppercase text-on-surface-variant">
                    Layanan Pemesanan &amp; Pool
                  </span>
                  <p className="text-body-md font-semibold text-on-surface">Senin - Minggu: Buka 24 Jam</p>
                </div>
                <div className="rounded-lg bg-surface-lowest p-3">
                  <span className="mb-1 block text-label-md font-semibold uppercase text-secondary">
                    WhatsApp Admin
                  </span>
                  <p className="text-body-md font-semibold text-on-surface">{phoneDisplay}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-body-lg font-bold text-on-surface">Navigasi &amp; Pembayaran</h4>
              <nav aria-label="Navigasi footer" className="mb-3 flex flex-col gap-2">
                <a
                  className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  href="#armada"
                >
                  Katalog Armada
                </a>
                <a
                  className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  href="#tata-cara"
                >
                  Persyaratan Sewa
                </a>
                <a
                  className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  href="#tata-cara"
                >
                  Layanan Sopir
                </a>
                <a
                  className="text-body-md text-on-surface-variant transition-colors hover:text-on-surface"
                  href="#cek-status"
                >
                  Cek Status
                </a>
              </nav>
              <div className="rounded-lg bg-surface-lowest p-3">
                <span className="mb-1 block text-label-md font-semibold uppercase text-on-surface-variant">
                  Rekening Resmi
                </span>
                <p className="text-body-md font-semibold text-on-surface">Bank Central Asia (BCA)</p>
                <p className="font-mono text-body-md text-on-surface">541-098-7201</p>
                <p className="mt-0.5 text-label-md text-on-surface-variant">a.n. CV FA RENT CAR</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-body-lg font-bold text-on-surface">Kepatuhan &amp; Legalitas</h4>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Data reservasi dan identitas penyewa diproses secara terenkripsi sesuai amanat
                Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022). Tidak ada
                penyalahgunaan data untuk pihak ketiga.
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon className="text-secondary" name="lock" size="sm" />
                  <span className="text-label-md">Enkripsi Data KTP &amp; SIM</span>
                </span>
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon className="text-secondary" name="description" size="sm" />
                  <span className="text-label-md">Perjanjian Sewa Digital</span>
                </span>
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <Icon className="text-secondary" name="verified_user" size="sm" />
                  <span className="text-label-md">Serah Terima Terdokumentasi</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-surface-highest pt-6 text-on-surface-variant sm:flex-row">
            <p className="text-label-md">
              © {new Date().getFullYear()} CV FA RENT CAR. Hak cipta dilindungi.
            </p>
            <div className="flex items-center gap-gutter text-label-md">
              <a className="transition-colors hover:text-on-surface" href="#kontak">
                Kebijakan Privasi
              </a>
              <a className="transition-colors hover:text-on-surface" href="#kontak">
                Syarat &amp; Ketentuan
              </a>
              <a className="transition-colors hover:text-on-surface" href="#kontak">
                Pusat Bantuan
              </a>
            </div>
          </div>
        </div>
      </footer>

      <BottomTabBar
        ariaLabel="Navigasi beranda FA RENT CAR"
        items={[
          { label: 'Armada', icon: 'directions_car', href: '#armada' },
          { label: 'Cari', icon: 'search', href: '#beranda' },
          { label: 'Booking', icon: 'receipt_long', href: '#tata-cara' },
          { label: 'Bantuan', icon: 'support_agent', href: '#kontak' },
          { label: 'Akun', icon: 'account_circle', href: '#cek-status' },
        ]}
      />
    </div>
  );
}

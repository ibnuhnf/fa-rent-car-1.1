import { BottomTabBar, Brand, ButtonLink, Card, EmptyState, Icon } from '@fa/ui';

const whatsappUrl =
  'https://wa.me/6285224484488?text=Halo%20FA%20RENT%20CAR%2C%20saya%20ingin%20menanyakan%20ketersediaan%20mobil.';

const services = [
  {
    icon: 'directions_car',
    title: 'Sewa lepas kunci',
    description: 'Konsultasikan pilihan unit dan jadwal pengambilan langsung dengan admin.',
  },
  {
    icon: 'person_pin_circle',
    title: 'Sewa dengan sopir',
    description: 'Sampaikan kebutuhan perjalanan Anda kepada admin untuk informasi layanan.',
  },
  {
    icon: 'location_on',
    title: 'Ambil di kantor',
    description: 'Pengambilan dan pengembalian dilakukan di kantor FA RENT CAR, Kedawung.',
  },
];

const steps = [
  ['1', 'Hubungi admin', 'Kirim kebutuhan tanggal dan jenis layanan melalui WhatsApp.'],
  [
    '2',
    'Konfirmasi langsung',
    'Admin membantu mengecek informasi unit dan biaya sewa yang berlaku.',
  ],
  ['3', 'Atur pengambilan', 'Setelah disepakati, admin mengarahkan proses berikutnya di kantor.'],
] as const;

export default function CustomerHomePage() {
  return (
    <div className="min-h-dvh bg-background pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-surface-highest bg-surface-lowest/85 shadow-topbar backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-container-max items-center justify-between gap-3 px-5 lg:h-[72px] lg:px-6">
          <a aria-label="FA RENT CAR, kembali ke beranda" href="#beranda">
            <Brand subtitle="Rental & Mobility" />
          </a>
          <nav
            aria-label="Navigasi beranda"
            className="hidden items-center gap-1 rounded-full bg-surface-low p-1 lg:flex"
          >
            <a
              className="rounded-full bg-surface-lowest px-4 py-2 text-body-md font-semibold text-on-surface shadow-card"
              href="#beranda"
            >
              Beranda
            </a>
            <a
              className="rounded-full px-4 py-2 text-body-md text-on-surface-variant transition hover:text-on-surface"
              href="#layanan"
            >
              Layanan
            </a>
            <a
              className="rounded-full px-4 py-2 text-body-md text-on-surface-variant transition hover:text-on-surface"
              href="#cara"
            >
              Cara Hubungi
            </a>
            <a
              className="rounded-full px-4 py-2 text-body-md text-on-surface-variant transition hover:text-on-surface"
              href="#bantuan"
            >
              Kontak & Bantuan
            </a>
          </nav>
          <ButtonLink
            className="shrink-0"
            href={whatsappUrl}
            icon="chat"
            rel="noreferrer"
            target="_blank"
            variant="whatsapp"
          >
            <span className="hidden sm:inline">WhatsApp Admin</span>
            <span className="sm:hidden">Admin</span>
          </ButtonLink>
        </div>
      </header>

      <main id="beranda">
        <section className="mx-auto grid max-w-container-max gap-8 px-5 pb-12 pt-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:gap-16 lg:px-6 lg:pb-20 lg:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary-fixed px-3 py-1.5 text-label-md uppercase tracking-[0.06em] text-on-secondary-fixed-variant">
              <span aria-hidden className="size-1.5 rounded-full bg-secondary" />
              FA RENT CAR · Cirebon
            </p>
            <h1 className="mt-5 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg lg:text-display-lg">
              Sewa Mobil Lepas Kunci &amp; Dengan Sopir di Cirebon
            </h1>
            <p className="mt-5 max-w-2xl text-body-lg text-on-surface-variant">
              Informasi layanan rental mobil CV FA RENT CAR. Hubungi admin untuk menanyakan pilihan
              unit, jadwal, dan proses sewa.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={whatsappUrl}
                icon="chat"
                rel="noreferrer"
                size="lg"
                target="_blank"
                variant="whatsapp"
              >
                Chat WhatsApp Admin
              </ButtonLink>
              <ButtonLink href="#bantuan" size="lg" variant="outline">
                Lihat informasi kontak
              </ButtonLink>
            </div>
          </div>

          <Card padding="lg">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-surface-lowest">
              <Icon name="directions_car" size="lg" />
            </span>
            <p className="mt-6 text-label-md uppercase tracking-[0.08em] text-secondary">
              Status layanan digital
            </p>
            <h2 className="mt-2 font-display text-headline-md text-on-surface">
              Pemesanan online sedang dipersiapkan
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
              Katalog, pengecekan ketersediaan, dan pemesanan online belum tersedia pada tahap ini.
              Admin tetap siap membantu melalui WhatsApp.
            </p>
          </Card>
        </section>

        <section
          aria-labelledby="layanan-heading"
          className="border-y border-surface-highest bg-surface-low py-12 lg:py-16"
          id="layanan"
        >
          <div className="mx-auto max-w-container-max px-5 lg:px-6">
            <p className="text-label-md uppercase tracking-[0.08em] text-secondary">
              Informasi layanan
            </p>
            <h2
              className="mt-2 font-display text-headline-lg-mobile text-on-surface sm:text-headline-lg"
              id="layanan-heading"
            >
              Hubungi kami untuk kebutuhan perjalanan Anda
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {services.map((service) => (
                <Card key={service.title} padding="md">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant">
                    <Icon name={service.icon} size="lg" />
                  </span>
                  <h3 className="mt-5 text-title text-on-surface">{service.title}</h3>
                  <p className="mt-2 text-body-md text-on-surface-variant">{service.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="online-heading"
          className="mx-auto max-w-container-max px-5 py-12 lg:px-6 lg:py-20"
          id="informasi"
        >
          <EmptyState
            className="items-center text-center"
            description="Silakan gunakan WhatsApp untuk konsultasi sampai fitur katalog dan pemesanan online tersedia."
            icon="event_busy"
            title="Katalog dan pemesanan online belum tersedia"
            action={
              <ButtonLink
                href={whatsappUrl}
                icon="chat"
                rel="noreferrer"
                target="_blank"
                variant="whatsapp"
              >
                Hubungi Admin
              </ButtonLink>
            }
          />
          <h2 className="sr-only" id="online-heading">
            Status pemesanan online
          </h2>
        </section>

        <section
          aria-labelledby="cara-heading"
          className="mx-auto max-w-container-max px-5 pb-12 lg:px-6 lg:pb-20"
          id="cara"
        >
          <p className="text-label-md uppercase tracking-[0.08em] text-secondary">
            Mulai dari WhatsApp
          </p>
          <h2
            className="mt-2 font-display text-headline-lg-mobile text-on-surface sm:text-headline-lg"
            id="cara-heading"
          >
            Cara menghubungi kami saat ini
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <Card key={number} padding="md">
                <span className="flex size-10 items-center justify-center rounded-xl bg-secondary-fixed text-label-md text-on-secondary-fixed-variant">
                  {number}
                </span>
                <h3 className="mt-5 text-title text-on-surface">{title}</h3>
                <p className="mt-2 text-body-md text-on-surface-variant">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="bantuan-heading"
          className="bg-primary py-12 text-surface-lowest lg:py-16"
          id="bantuan"
        >
          <div className="mx-auto grid max-w-container-max gap-8 px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-6">
            <div>
              <p className="text-label-md uppercase tracking-[0.08em] text-secondary-fixed">
                Kantor & bantuan
              </p>
              <h2
                className="mt-2 font-display text-headline-lg-mobile sm:text-headline-lg"
                id="bantuan-heading"
              >
                FA RENT CAR siap dihubungi 24 jam
              </h2>
              <address className="mt-4 not-italic text-body-lg text-surface-highest">
                Jl. Pilang Raya No.10, Pilangsari, Kedawung, Cirebon
              </address>
              <p className="mt-2 text-body-md text-surface-highest">WhatsApp: 0852-2448-4488</p>
            </div>
            <ButtonLink
              href={whatsappUrl}
              icon="chat"
              rel="noreferrer"
              size="lg"
              target="_blank"
              variant="whatsapp"
            >
              Chat WhatsApp Admin
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-highest bg-surface-lowest py-8">
        <div className="mx-auto flex max-w-container-max flex-col gap-4 px-5 text-caption text-on-surface-variant lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <Brand subtitle="Rental & Mobility" />
          <p>© {new Date().getFullYear()} CV FA RENT CAR. Hak cipta dilindungi.</p>
        </div>
      </footer>

      <BottomTabBar
        ariaLabel="Navigasi beranda FA RENT CAR"
        items={[
          { label: 'Beranda', icon: 'home', href: '#beranda', active: true },
          { label: 'Layanan', icon: 'directions_car', href: '#layanan' },
          { label: 'Info', icon: 'info', href: '#informasi' },
          { label: 'Bantuan', icon: 'support_agent', href: '#bantuan' },
        ]}
      />
    </div>
  );
}

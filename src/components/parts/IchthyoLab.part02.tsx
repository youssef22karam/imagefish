 justify-center rounded-lg bg-cyan-400/20 text-cyan-200">
                          <Upload size={18} />
                        </span>
                        <div>
                          <strong className="block text-xs font-bold text-white">
                            Upload or Paste Any 2D Fish Image
                          </strong>
                          <small className="text-[11px] text-slate-300/85">
                            Extracts exact shape, fins, tail, UV patterns, scales &amp; skin tags
                          </small>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPromptOpen(true)}
                      className="mt-2 flex w-full items-center justify-between rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Wand2 size={14} /> Global Master Prompt Builder
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  </section>

                  {/* Instant 1-Click Sample Synthesis */}
                  <section className="preset-section">
                    <div className="section-heading">
                      <h2 className="section-label">
                        <Sparkles size={15} /> 1-Click 2D → 3D Demo Plates
                      </h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {BUILTIN_SAMPLE_PLATES.map((sample) => {
                        const isBusy = quickSampleBusy === sample.id;
                        return (
                          <button
                            key={sample.id}
                            type="button"
                            disabled={Boolean(quickSampleBusy)}
                            onClick={() => void handleQuickSampleSynthesize(sample)}
                            className="specimen-row"
                          >
                            <img
                              src={sample.url}
                              alt={sample.name}
                              className="h-8 w-12 shrink-0 rounded bg-[#dce4ec] object-contain p-0.5"
                            />
                            <span>
                              <strong>{sample.name}</strong>
                              <small>{sample.badge}</small>
                            </span>
                            {isBusy ? (
                              <Loader2 size={14} className="animate-spin text-cyan-300" />
                            ) : (
                              <ChevronRight size={13} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Lineage & Hybridization Tools for Uploaded Specimens */}
                  <section className="lineage-section">
                    <h2 className="section-label">
                      <GitBranch size={15} /> Breed &amp; Evolve Specimen
                    </h2>
                    <div className="lineage-actions">
                      <button className="secondary-button" onClick={doOffspring}>
                        <Dna size={14} /> Offspring
                      </button>
                      <button
                        className={`secondary-button ${migrating ? 'is-active' : ''}`}
                        onClick={() => {
                          setMigrating(!migrating);
                          setCrossing(false);
                        }}
                      >
                        <Bird size={14} /> Migrate
                      </button>
                      <button
                        className={`secondary-button ${crossing ? 'is-active' : ''}`}
                        onClick={() => {
                          setCrossing(!crossing);
                          setMigrating(false);
                        }}
                      >
                        <ArrowLeftRight size={14} /> Cross
                      </button>
                    </div>
                    {migrating && (
                      <label className="migrate-label">
                        Select a destination
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) doMigrate(e.target.value as HabitatId);
                          }}
                        >
                          <option value="" disabled>
                            Choose an environment
                          </option>
                          {HABITATS.filter((b) => b.id !== H.id).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {crossing && (
                      <p className="side-notice">
                        Click any second fish in your Vault or Log below to cross-breed a living 3D hybrid!
                      </p>
                    )}
                  </section>

                  {/* PostgreSQL Saved Specimen Vault */}
                  <section className="log-section">
                    <div className="section-heading">
                      <h2 className="section-label">
                        <Database size={14} /> Saved 3D Vault
                      </h2>
                      <span className="mono muted">{loadingVault ? '…' : vault.length}</span>
                    </div>

                    {vault.length === 0 && !loadingVault && (
                      <p className="text-xs text-slate-400/80 py-2">
                        Every 2D fish you upload and materialize is automatically saved here in PostgreSQL.
                      </p>
                    )}

                    {vault.map((row) => (
                      <div
                        key={row.id}
                        className={`specimen-row ${sp.id === row.slug ? 'selected' : ''}`}
                        style={{ paddingRight: '0.45rem' }}
                      >
                        <button
                          type="button"
                          onClick={() => void handleLoadVaultRow(row)}
                          className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                        >
                          <img
                            src={row.sourcePreview}
                            alt={row.name}
                            className="h-7 w-11 shrink-0 rounded bg-[#dce4ec] object-contain p-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <strong className="block truncate">{row.name}</strong>
                            <small className="block truncate">
                              {row.bauplan} · {HABITAT[row.habitat as HabitatId]?.name ?? row.habitat}
                            </small>
                          </span>
                        </button>
                        <button
                          type="button"
                          title="Remove from vault"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => void handleDeleteVaultRow(row.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </section>
                </div>

                <div className="generator-footer">
                  <button
                    className="generate-button"
                    onClick={() => setUploadOpen(true)}
                    disabled={pending}
                  >
                    <ScanLine size={17} /> Synthesize from 2D Image <kbd>U</kbd>
                  </button>
                  <button
                    className="secondary-button surprise"
                    onClick={() => setSculptOpen((v) => !v)}
                  >
                    <Sliders size={15} /> Fine-Tune 3D Anatomy &amp; Dermis
                  </button>
                </div>
              </>
            ) : tab === 'gen' ? (
              <>
                <div className="left-scroll scroll-area">
                  <section className="env-section">
                    <div className="section-heading">
                      <h2 className="section-label">
                        <Waves size={15} /> Environment
                      </h2>
                      <span className="mono muted">{HABITATS.length} biomes</span>
                    </div>
                    <div className="biome-grid">
                      {biomes.map((b) => {
                        const Icon = iconFor[b.id] ?? Waves;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={`biome-card ${hab === b.id ? 'selected' : ''}`}
                            style={{ '--tone': tones[b.id] ?? '#86b8cd' } as CSSProperties}
                            aria-pressed={hab === b.id}
                            title={b.blurb}
                            onClick={() => {
                              if (hab !== b.id) {
                                setHab(b.id);
                                doGenerate(b.id);
                              }
                            }}
                          >
                            <Icon size={17} strokeWidth={1.65} />
                            <span>
                              <strong>{b.name}</strong>
                              <small>
                                {b.realm} · {depthLabel(b.depth[1])}
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      className="text-button show-more"
                      aria-expanded={allBiomes}
                      onClick={() => setAllBiomes((v) => !v)}
                    >
                      {allBiomes ? 'Show featured biomes' : 'View all environments'}{' '}
                      <ChevronDown className={allBiomes ? 'flipped' : ''} size={14} />
                    </button>
                    <p className="env-description">{sel.blurb}</p>
                  </section>

                  <section className="novelty-section">
                    <h2 className="section-label">
                      <Dna size={15} /> Genome
                    </h2>
                    <Slider
                      label="Novelty"
                      value={novelty}
                      step={0.01}
                      display={`${Math.round(novelty * 100)}%`}
                      onChange={setNovelty}
                    />
                    <div className="range-ends">
                      <button onClick={() => setNovelty(0)}>Known species</button>
                      <button onClick={() => setNovelty(1)}>Wild</button>
                    </div>
                    <p>
                      <strong>{stop[1]}.</strong> {stop[2]}
                    </p>
                    <label className="migrate-label plan-pick">
                      Body construction
                      <select
                        value={planPick}
                        onChange={(e) => setPlanPick(e.target.value as Plan | '')}
                        aria-label="Body construction"
                        disabled={novelty < 0.08}
                      >
                        <option value="">Any — chosen by the environment</option>
                        {(Object.keys(PLAN_NAMES) as Plan[]).map((p) => (
                          <option key={p} value={p}>
                            {PLAN_NAMES[p]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>

                  <section className="preset-section">
                    <div className="section-heading">
                      <h2 className="section-label">
                        <ScanLine size={15} /> Anatomy presets
                      </h2>
                      <button
                        className="text-button"
                        onClick={() => setAllPresets((v) => !v)}
                        aria-expanded={allPresets}
                      >
                        {allPresets ? 'Less' : 'View all'} <ChevronRight size={13} />
                      </button>
                    </div>
                    <div className="preset-grid">
                      {PRESETS.slice(0, allPresets ? PRESETS.length : 4).map((p) => (
                        <button
                          onClick={() => selectPreset(p)}
                          key={p.id}
                          className={`preset ${fish.anchor === p.anchor ? 'active' : ''}`}
                          title={`${p.label} — ${p.focus}`}
                        >
                          <Thumb sp={SPECIES_BY_ID[p.anchor]} w={49} h={28} />
                          <span>
                            <strong>{p.label}</strong>
                            <small>{p.focus}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="log-section">
                    <div className="section-heading">
                      <h2 className="section-label">Specimen log</h2>
                      <span className="mono muted">{log.length}</span>
                    </div>
                    {log.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => pickFish(f)}
                        className={`specimen-row ${f.key === fish.key ? 'selected' : ''}`}
                      >
                        <Thumb sp={f.species} w={49} h={28} />
                        <span>
                          <strong>{f.common}</strong>
                          <small>
                            {HABITAT[f.habitat].name} ·{' '}
                            {f.origin === 'uploaded'
                              ? '2D → 3D'
                              : f.real
                                ? 'Known'
                                : `${Math.round(f.novelty * 100)}% novel`}
                          </small>
                        </span>
                        <ChevronRight size={13} />
                      </button>
                    ))}
                  </section>
                </div>

                <div className="generator-footer">
                  <button className="generate-button" onClick={() => doGenerate()} disabled={pending}>
                    <Sparkles size={17} /> Generate specimen <kbd>G</kbd>
                  </button>
                  <button className="secondary-button surprise" onClick={doBlind} disabled={pending}>
                    <Dices size={16} /> Surprise me <kbd>B</kbd>
                  </button>
                </div>
              </>
            ) : (
              <div className="atlas-panel">
                <div className="atlas-search">
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={`Search ${SPECIES.length} species…`}
                      aria-label="Search the atlas"
                    />
                    {q && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => setQ('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="migrate-label atlas-filter">
                    <Layers3 size={15} />
                    <select
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      aria-label="Atlas species group"
                    >
                      {['All', ...GROUPS].map((g) => (
                        <option key={g} value={g}>
                          {g === 'All' ? 'All taxonomic groups' : g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="section-heading atlas-count">
                    <h2 className="section-label">
                      <Fish size={15} /> Species atlas
                    </h2>
                    <span className="mono muted">{filtered.length} results</span>
                  </div>
                </div>
                <div className="atlas-results scroll-area">
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`specimen-row ${sp.id === s.id ? 'selected' : ''}`}
                      onClick={() => doAtlas(s)}
                    >
                      <RefImg id={s.id} thumb alt="" className="atlas-thumb" />
                      <span>
                        <strong>{s.name}</strong>
                        <small>
                          <i>{s.sci}</i>
                        </small>
                      </span>
                      <ChevronRight size={13} />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="empty-state">No species match your search.</p>
                  )}
                </div>
              </div>
            )}
          </aside>
        )}

        <main className="stage" aria-label="3D specimen viewer" aria-busy={pending}>
          <div className="water-photo" style={{ opacity: photo ? 1 : 0.22 }} />
          <div
            className="water-tone"
            style={{ backgroundImage: backdrop, opacity: photo ? 0.14 : 0.7 }}
          />
          <div className="water-vignette" />

          <Viewer
            species={sp}
            seed={fish.seed}
            gape={gape}
            autoFeed={autoFeed}
            swim={swim}
            speed={speed}
            view={view}
            viewNonce={viewNonce}
            cameraAction={cameraAction}
            strike={strike}
            wire={wire}
            fins={fins}
            eyes={eyes}
            breathe={breathe}
            amb={H.amb}
            magic={magic}
            onBuilt={(a) => {
              setPending(false);
              setMaxJaw(a);
            }}
          />

          <div
            className="magic-flash"
            key={`f${magic.nonce}`}
            data-tier={magic.tier}
            style={{ '--tier': magic.color } as CSSProperties}
            aria-hidden="true"
          />

          {/* Live 3D Anatomy & Dermis Sculptor Floating Drawer */}
          <AnatomyTunerDrawer
            open={sculptOpen}
            species={sp}
            canSaveDb={true}
            savingDb={savingDb}
            onChangeSpecies={handleLiveSpeciesSculpt}
            onSaveDb={() => void handleSaveCurrentToVault()}
            onClose={() => setSculptOpen(false)}
          />

          <div className="stage-top">
            <div className="stage-chips">
              <div className="viewport-label">
                <Box size={15} /> <span>3D Viewport</span>
              </div>
              <button
                className="codex-chip"
                title="Living species discovered"
                onClick={() => {
                  setTab('atlas');
                  setList(true);
                }}
              >
                <BookOpen size={13} /> Codex <b>{codex.length}</b>
                <span>/{SPECIES.length}</span>
              </button>
              <button
                className="sound-chip"
                aria-pressed={sound}
                title={sound ? 'Mute discovery chimes' : 'Play discovery chimes'}
                onClick={() =>
                  setSound((v) => {
                    try {
                      localStorage.setItem('ig-sound', v ? '0' : '1');
                    } catch {
                      /* private mode */
                    }
                    return !v;
                  })
                }
              >
                {sound ? '♪' : '–'}
              </button>
            </div>

            <nav className="view-tabs" aria-label="Camera views">
              {VIEWS.map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={view === id}
                  onClick={() => {
                    setView(id);
                    setViewNonce((n) => n + 1);
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="specimen-title" aria-live="polite">
            <div
              className="discovery-badge"
              key={`b${magic.nonce}`}
              data-tier={magic.tier}
              style={{ '--tier': magic.color } as CSSProperties}
            >
              <Sparkles size={12} /> <span>{magic.label}</span>
            </div>
            <div className="specimen-kicker">
              <span className="live-dot" /> <span>{specLabel} specimen</span>
              <span className="title-line" />
            </div>
            <h1
              key={`t${magic.nonce}`}
              className="title-reveal"
              style={{ '--tier': magic.color } as CSSProperties}
            >
              {fish.common.split('').map((ch, i) => (
                <span key={i} style={{ animationDelay: `${0.18 + Math.min(i * 0.02, 0.5)}s` }}>
                  {ch}
                </span>
              ))}
            </h1>
            <div className="specimen-sci">
              <i>{fish.latin}</i>
              <span />
              <span className="habitat-name">{H.name}</span>
            </div>
          </div>

          {pending && (
            <div className="build-status" role="status">
              <span /> Building 3D specimen
            </div>
          )}

          <div className="stage-reticle" aria-hidden="true">
            <span>SURFACE</span>
            <div />
            <span>{depthLabel(H.depth[1])}</span>
          </div>

          <div className="camera-buttons" aria-label="Camera tools">
            <button
              className="icon-button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => camera('in')}
            >
              <Plus size={17} />
            </button>
            <button
              className="icon-button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => camera('out')}
            >
              <Minus size={17} />
            </button>
            <button
              className="icon-button reset-button"
              title="Reset view (R)"
              aria-label="Reset view"
              onClick={() => camera('fit')}
            >
              <Crosshair size={16} />
            </button>
          </div>

          <div className="stage-bottom">
            <div className="stage-hints">
              <span>
                <Mouse size={14} /> Drag to orbit <b>·</b> Scroll to zoom <b>·</b> Drop any 2D image to synthesize
              </span>
              <span className="mono stage-seed">
                {fish.origin === 'uploaded'
                  ? '2D→3D LOCK'
                  : `SEED ${fish.seed.toString(10).padStart(5, '0')}`}
              </span>
            </div>

            <section className="motion-deck" aria-label="Animation and anatomy controls">
              <div className="motion-heading">
                <h2 className="section-label">
                  <SlidersHorizontal size={16} /> Anatomy &amp; motion
                </h2>
                <button
                  className="strike-button"
                  type="button"
                  title="Trigger a single feeding strike (Space)"
                  disabled={maxJaw <= 0}
                  onClick={fire}
                >
                  <Zap size={14} /> Trigger strike
                </button>
              </div>
              <div className="motion-grid">
                <Slider
                  label="Jaw opening"
                  value={gape}
                  step={0.01}
                  display={`${Math.round(gape * maxJaw)}°`}
                  onChange={(v) => {
                    setGape(v);
                    setAutoFeed(false);
                  }}
                  kind="jaw-slider"
                  disabled={maxJaw <= 0}
                />
                <Slider
                  label="Swim speed"
                  value={speed}
                  step={0.05}
                  min={0.25}
                  max={2}
                  display={`${speed.toFixed(2).replace(/0$/, '')}×`}
                  onChange={setSpeed}
                />
                <div className="switches">
                  <Toggle label="Swim" on={swim} set={setSwim} />
                  <Toggle label="Fin motion" on={fins} set={setFins} />
                  <Toggle label="Breathing" on={breathe} set={setBreathe} />
                  <Toggle label="Eye tracking" on={eyes} set={setEyes} />
                  <Toggle
                    label="Auto feed"
                    on={autoFeed}
                    set={(v) => {
                      if (v) setGape(0);
                      setAutoFeed(v);
                    }}
                  />
                  <Toggle label="Mesh" on={wire} set={setWire} />
                </div>
              </div>
            </section>
          </div>
        </main>

        {panel && (
          <aside className="field-panel" aria-label="Field guide">
            <FieldGuide
              fish={fish}
              census={census}
              onPick={pickFish}
              onRecensus={() => setCensusSeed((n) => n + 1)}
              onClose={() => setPanel(false)}
            />
          </aside>
        )}
      </div>

      <footer className="lab-footer">
        <span>
          <Activity size={13} /> {pending ? 'Building 3D geometry' : 'Live 3D WebGL simulation'}
        </span>
        <span className="footer-spec">
          {NICHE_INFO[fish.niche]?.name ?? 'Predator'} <i />{' '}
          {fish.clade ?? LINEAGES[fish.lineage]?.name ?? 'Teleost'}
        </span>
        <button onClick={() => setHelp(true)}>
          <Keyboard size={15} /> Shortcuts <ArrowDownRight size={12} />
        </button>
      </footer>

      {help && <Help close={() => setHelp(false)} />}

      <UploadStudioModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onAccept={handleAcceptReconstruction}
        onOpenPromptArchitect={() => {
          setUploadOpen(false);
          setPromptOpen(true);
        }}
      />

      <PromptArchitectModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        onSwitchToUpload={
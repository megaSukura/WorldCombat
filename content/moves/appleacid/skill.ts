/**
 * 苹果酸 / appleacid —— 注册与动作。
 *
 * 核心念头：**扔出一颗会发酵的酸苹果**——它砸中目标就把对方的特防泡软，并留一层「发酵」；
 * 目标在发酵没退之前再挨一颗，第二口更狠（−2）。落点摊开一小滩冒酸泡的果浆，走进去的人会被浸到发酵、
 * 留在里面还会被反复咬；苹果核落在地上当个真东西。它是四式里唯一扔真东西、唯一能对同一目标叠酸的那个。
 *
 * 三幕：
 *   起（windup，提交前）：手里掂着酸苹果、酸汁滴落（`action.present` 预告，不碰世界）。
 *   掷（throw，提交后）：低弧抛出苹果（原生投射物携带物品外观）。
 *   爆（burst → patch）：命中活物或地面时炸成酸浆，溅到落点周围每个人；主目标吃 `core`、周围吃 `splash`，
 *       各自按是否已带 `world_combat:status/sour` 决定掉 1 级还是 2 级特防，并刷新/施加发酵；
 *       原地租借一滩酸浆（规则 `world_combat:appleacid_patch` 由本单元注册），走进去先被浸到发酵、留在里面被咬。
 *   落空：苹果没砸到活物就落到地上，留成一颗真苹果（`miss`）。
 *
 * 与同族分开：溶解液是低弧的一团酸、落点留腐蚀池、只是概率掉防；苹果酸是把一颗真苹果扔出去，
 * 命中必定掉防、能对同一目标叠到 −2，苹果核留在地上。
 *
 * 配置 `ferment`（发酵式）由 resolve 改时序与射程、由公式改发酵与酸浆：开启＝更黏、更容易叠；
 * 关闭（爆汁式）＝一发更痛、溅得更开、飞得更快。
 */
namespace PokemonSkills {
    const appleacidScene = "world_combat:move_appleacid";
    const appleacidSour = "world_combat:appleacid_sour";
    const appleacidPatch = "world_combat:appleacid_patch";
    const appleacidSourText = "world_combat.move.appleacid.text.sour";
    const appleacidStackText = "world_combat.move.appleacid.text.stack";
    const appleacidMissText = "world_combat.move.appleacid.text.miss";

    /** 把发酵身份施加到任意战斗者身上，走共享身份；`unique` 让同身份只留最新一层。 */
    function appleacidFerment(world: CombatWorld, actor: CombatActor, ticks: number): void {
        CombatStatus.apply(world, actor, "sour", appleacidSour, ticks, 0, { unique: true });
    }

    /** 落点酸浆：走进去先被浸到发酵，每 `pulse` 刻咬没走开的人一口。 */
    WorldEffects.fieldRule(appleacidPatch, {
        enter: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            appleacidFerment(world, actor, Math.max(20, Math.round(field.data.sourTicks || 60)));
            WorldFeedback.emit(world, appleacidScene, 1, body.position(),
                { moment: "soak", target: String(actor.ref()), cores: field.data.cores, scale: field.data.scale,
                    intensity: Math.max(0.4, Math.min(1.4, (field.data.damage || 7) / 7)) }, 20);
        },
        stay: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const next = field.data.next || (field.data.next = {}), ref = String(actor.ref());
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + Math.max(4, Math.round(field.data.pulse || 20));
            const body = world.observe(actor);
            if (body === null) return;
            if (hurt(world, actor, "appleacid", field.data.damage || 0, { damage: damageSpec("appleacid", "patch") }))
                WorldFeedback.emit(world, appleacidScene, 1, body.position(),
                    { moment: "patch_hit", target: ref, cores: field.data.cores, scale: field.data.scale,
                        intensity: Math.max(0.4, Math.min(1.4, (field.data.damage || 7) / 7)) }, 18);
        }
    });

    define({
        id: "appleacid",
        name: "Apple Acid",
        description: "扔出一颗酸苹果：命中时炸成酸浆，主目标与落点周围的人都掉特防；带着发酵身份的目标再挨一颗会更狠（−2）。落点留下一滩冒泡的酸浆，走进去会被浸到发酵、留在里面会被反复咬；苹果核留在地上。发酵式更黏更易叠酸，爆汁式一发更痛、溅得更开。",
        uses: ["对同一个目标连扔两颗，把特防叠到 −2", "一次溅到聚在落点周围的多个对手", "用余下的酸浆封住一小片地"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 48,
        style: "grass",
        defaults: { ferment: false, ai: { maxChase: 13, stackSour: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("appleacid", "splashRadius", pokemon), geometry: "area", style: "grass",
                color: 0x9EC44A, label: config && config.ferment === true ? "发酵苹果酸" : "爆汁苹果酸" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["appleacid"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const ferment = !!(config && config.ferment);
            return {
                prepare: Math.round(p("appleacid", "tempo", context)),
                recover: 8,
                cooldown: 48 + (ferment ? 10 : 0),
                active: 0,
                range: p("appleacid", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:appleacid:" + action.id(), appleacidScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", ferment: config && config.ferment ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("appleacid", "core", action);
            const splashPower = p("appleacid", "splash", action);
            const patchPower = p("appleacid", "patch", action);
            const speed = p("appleacid", "globSpeed", action);
            const gravity = p("appleacid", "globGravity", action);
            const radius = p("appleacid", "globRadius", action);
            const splashRadius = p("appleacid", "splashRadius", action);
            const patchRadius = p("appleacid", "patchRadius", action);
            const patchTicks = Math.max(30, Math.round(p("appleacid", "patchTicks", action)));
            const patchPulse = Math.max(6, Math.round(p("appleacid", "patchPulse", action)));
            const sourStages = Math.max(1, Math.round(p("appleacid", "sourStages", action)));
            const secondStages = Math.max(1, Math.round(p("appleacid", "secondStages", action)));
            const sourTicks = Math.max(30, Math.round(p("appleacid", "sourTicks", action)));
            const cores = Math.max(10, Math.round(p("appleacid", "cores", action)));
            const scale = Math.max(0.6, Math.min(2.4, splashRadius / 2.2));
            const intensity = Math.max(0.5, Math.min(2.2, power / 62));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 一人一咬：按是否已带发酵决定掉 1 级还是 2 级，并刷新发酵。 */
            function bite(current: CombatAction, victim: CombatActor, powerValue: number, segment: string, at: CombatPoint): void {
                const scope = current.world();
                const ripe = CombatStatus.has(scope, victim, "sour");
                const stages = ripe ? secondStages : sourStages;
                if (!hurt(current, victim, "appleacid", powerValue, { damage: damageSpec("appleacid", segment) })) return;
                NativeEffects.boost(scope, victim, "spd", -stages);
                appleacidFerment(scope, victim, sourTicks);
                WorldFeedback.emit(scope, appleacidScene, 1, at,
                    { moment: ripe ? "stack" : "hit", target: String(victim.ref()), cores: cores, scale: scale,
                        intensity: ripe ? Math.min(2.4, intensity * 1.2) : intensity }, 24);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                    ripe ? appleacidStackText : appleacidSourText, [stages], 28);
            }

            function burst(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                const scope = current.world();
                let hits = 0;
                if (primary !== null && scope.valid(primary) && !scope.friendly(primary)) {
                    const body = scope.observe(primary);
                    if (body !== null) { bite(current, primary, power, "core", body.position()); hits++; }
                }
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, splashRadius, { below: 2, above: 3 }), function (other, facts) {
                    if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                    bite(current, other, splashPower, "splash", facts.position());
                    hits++;
                });
                WorldFeedback.emit(scope, appleacidScene, 1, point,
                    { moment: "burst", target: primary === null ? "" : String(primary.ref()), splash: splashRadius, cores: cores,
                        scale: scale, hits: hits, intensity: intensity }, 28);
                sound(current, "cobblemon:impact.grass");
                WorldEffects.field(scope, appleacidPatch, point, patchRadius,
                    { damage: patchPower, pulse: patchPulse, sourTicks: sourTicks, cores: cores, scale: scale, next: {} }, patchTicks);
                WorldFeedback.keep(scope, "appleacid:patch:" + String(current.id()), appleacidScene, 1, point,
                    { moment: "patch", splash: patchRadius, cores: cores, scale: scale,
                        intensity: Math.max(0.4, Math.min(1.6, patchPower / 7)) }, patchTicks);
                finish(current);
            }

            sound(action, "minecraft:entity.wind_charge.throw");
            WorldFeedback.keep(world, "appleacid:throw:" + action.id(), appleacidScene, 1, action.origin(),
                { moment: "throw", cores: cores, scale: scale, intensity: intensity }, 60);
            const launch = LivingActions.ballistic(action.origin(), action.targetPosition(), speed, gravity);
            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                direction: launch === null ? undefined : launch,
                appearance: { item: "minecraft:apple", glow: false, scale: Math.max(1.0, radius / 0.22) },
                impact: function (current: CombatAction, hit: CombatImpact) { burst(current, hit.position(), hit.target()); }
            }, function (current: CombatAction) {
                if (settled) return;
                WorldFeedback.emit(current.world(), appleacidScene, 1, current.targetPosition(),
                    { moment: "miss", cores: cores, scale: scale, intensity: 0.8 }, 22);
                WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.9, 0)), appleacidMissText, [], 24);
                current.world().dropItem(current.targetPosition(), "minecraft:apple", 1, JSON.stringify({ pickupDelay: 20 }));
                sound(current, "minecraft:entity.item.pickup");
                finish(current);
            });
        }
    });
}

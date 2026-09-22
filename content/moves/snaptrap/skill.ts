/**
 * 捕兽夹 / snaptrap 的出手方式。
 *
 * 核心念头：把一只合着的铁夹抛到选定的点上撑开埋好，然后走开——它留在那里等人踩。谁先踩进来就被一口
 * 咬住钉在原地，夹齿一下一下地磨；施法者不陪着，这是它与贝壳夹击最大的不同。
 *
 * 三幕：
 *   起（windup，提交前）：把夹齿撑开、对准落点的预告。
 *   埋（toss → armed）：提交后夹子飞向落点，落地撑开待命 `waitTicks`；布设延迟 `armTicks` 之后才咬人。
 *   咬（snap → chew）：第一个踏进触发半径的非友方被合上（`bite` 伤害 + 缠住 `holdTicks`），随后夹齿
 *       每 `interval` 磨一次（`chew`）；被带离 `escape` 格、目标倒下或时长走完就分开。
 *
 * 夹子是持久效果（`world_combat:snaptrap_armed`），咬合是另一个持久效果（`world_combat:snaptrap_jaw`）；
 * 咬住的身份是共享的 `world_combat:status/partiallytrapped`（本单元的 `world_combat:snared_jaw`）。
 * 反制：绕开埋点、把被夹的目标推开、或提前把夹子引掉；施法者离得太远夹子也会失效。
 *
 * 配置 `wide`（广域式）由 resolve 改时序、由公式改触发与咬合：开启＝更容易踩到但更轻更短；关闭＝埋得更久更狠。
 */
namespace PokemonSkills {
    const snaptrapScene = "world_combat:move_snaptrap";
    const snaptrapArmed = "world_combat:snaptrap_armed";
    const snaptrapJaw = "world_combat:snaptrap_jaw";
    const snaptrapSnared = "world_combat:snared_jaw";
    const snaptrapSnapText = "world_combat.move.snaptrap.text.snap";
    const snaptrapFadeText = "world_combat.move.snaptrap.text.fade";
    const snaptrapSlipText = "world_combat.move.snaptrap.text.slip";

    function snaptrapPoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    function snaptrapArmedData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid snap trap point");
        ["trigger", "armAt", "bite", "chew", "interval", "hold", "escape", "band", "jaws"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid snap trap state");
        });
        return JSON.stringify(value);
    }

    function snaptrapJawData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid snap trap jaw point");
        ["interval", "chew", "escape", "jaws"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid snap trap jaw state");
        });
        return JSON.stringify(value);
    }

    /** 合上：先咬一口，再把目标缠住并挂上夹齿的持续效果。直击与踩中走同一条路，返回是否咬实。 */
    function snaptrapApply(world: CombatWorld, victim: CombatActor, at: CombatPoint, data: any): boolean {
        const body = world.observe(victim);
        if (body === null) return false;
        hurt(world, victim, "snaptrap", data.bite, { damage: damageSpec("snaptrap", "bite"), contact: true });
        if (!world.valid(victim)) return false;
        MobEffects.apply(world, victim, snaptrapSnared, Math.max(20, Math.round(data.hold)), 0);
        world.effect(snaptrapJaw, victim, JSON.stringify({ point: [at.x(), at.y(), at.z()], interval: data.interval,
            chew: data.chew, escape: data.escape, jaws: data.jaws, slipped: false }), Math.max(40, Math.round(data.hold)) + 40);
        WorldFeedback.emit(world, snaptrapScene, 1, body.position(),
            { moment: "snap", target: String(victim.ref()), jaws: data.jaws, intensity: Math.max(0.6, Math.min(2, data.bite / 30)) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), snaptrapSnapText,
            [Math.round(data.hold / 20 * 10) / 10], 30);
        world.sound("minecraft:block.iron_trapdoor.close", body.position(), 16, "{}");
        return true;
    }

    /** 埋好的夹子踩中时：标记已触发，合上，然后收起这件夹子。 */
    function snaptrapSpring(effect: CombatEffect, victim: CombatActor, at: CombatPoint, data: any): void {
        data.sprung = true;
        effect.state(JSON.stringify(data));
        snaptrapApply(effect.world(), victim, at, data);
        effect.end();
    }

    WorldCombat.effect(snaptrapArmed, 1, 500, "actor", snaptrapArmedData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(snaptrapArmed, "start", function (effect) { effect.schedule("watch", "watch", 2, "{}"); });
    WorldCombat.effectHandler(snaptrapArmed, "watch", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (data.sprung) { effect.end(); return; }
        const at = snaptrapPoint(data.point);
        if (world.tick() < data.armAt) { effect.schedule("watch", "watch", 2, "{}"); return; }
        // 夹子贴地：用来访者脚、身体中心与头采样同一个地面圈（判定与画面读同一半径与高度带），踩中第一人即合上。
        let caught = false;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, data.trigger, { below: 0.2, above: data.band }), function (actor, facts) {
            if (caught || String(actor.ref()) === String(effect.source().ref())) return;
            if (!world.clear(at, facts.position())) return;
            caught = true;
            snaptrapSpring(effect, actor, at, data);
        });
        if (caught) return;
        effect.schedule("watch", "watch", 2, "{}");
    });
    WorldCombat.effectHandler(snaptrapArmed, "end", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (data.sprung || !world.valid(effect.target())) return;
        const body = world.observe(effect.target());
        if (body === null) return;
        WorldFeedback.emit(world, snaptrapScene, 1, snaptrapPoint(data.point), { moment: "fade" }, 22);
        WorldFeedback.text(world, snaptrapPoint(data.point).plus(WorldCombat.point(0, 0.6, 0)), snaptrapFadeText, [], 22);
    });

    WorldCombat.effect(snaptrapJaw, 1, 400, "actor", snaptrapJawData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(snaptrapJaw, "start", function (effect) { effect.schedule("chew", "chew", 1, "{}"); });
    WorldCombat.effectHandler(snaptrapJaw, "chew", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        if (body.position().minus(snaptrapPoint(data.point)).length() > data.escape) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        hurt(world, victim, "snaptrap", data.chew, { damage: damageSpec("snaptrap", "chew"), contact: true });
        if (!world.valid(victim)) { effect.end(); return; }
        WorldFeedback.emit(world, snaptrapScene, 1, body.position(),
            { moment: "chew", target: String(victim.ref()), jaws: data.jaws, chew: data.chew }, 20);
        world.sound("cobblemon:move.bite.target", body.position(), 16, "{}");
        effect.schedule("chew", "chew", Math.max(4, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(snaptrapJaw, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const snared = MobEffects.read(world, victim, snaptrapSnared);
            if (snared !== null) world.removeMobEffect(victim, snaptrapSnared, snared.key());
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, snaptrapScene, 1, body.position(),
                    { moment: data.slipped ? "release" : "loose", target: String(victim.ref()) }, 22);
                if (data.slipped) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), snaptrapSlipText, [], 24);
            }
        }
    });

    // 被夹住的目标无法移动：对宝可梦与原生生物一致归零导航速度（效果自带移动属性归零）。
    WorldCombat.on("world_combat:move_snaptrap/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), snaptrapSnared) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    /** 把落点压到地表：保留原本的水平位置（夹子就埋在命中的那一点），只把高度落到地面。 */
    function snaptrapGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const baseX = Math.floor(point.x()), baseZ = Math.floor(point.z()), baseY = Math.floor(point.y());
        for (let dy = 1; dy >= -4; dy--) {
            const block = world.block(WorldCombat.point(baseX, baseY + dy, baseZ));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return WorldCombat.point(point.x(), baseY + dy + 1, point.z());
        }
        return point;
    }

    define({
        id: "snaptrap",
        name: "Snap Trap",
        description: "把一只撑开的铁夹抛到选定的点上埋好，然后走开：哪个敌人先踩进来就被一口咬住钉在原地，夹齿持续磨到时长走完或被扯开。广域式更容易踩到但更轻更短；精准式埋得更久更狠。",
        uses: ["提前在敌人必经之路上埋夹", "封住一条通道的一角", "把冲过来的目标钉住等队友来收", "在打不过时先手限制对手"],
        kind: "point",
        range: 9,
        maxRange: 13.5,
        prepare: 12,
        active: 12,
        recover: 10,
        cooldown: 44,
        style: "snaptrap",
        defaults: { wide: false, ai: { maxChase: 11, lead: 8, preferMovers: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("snaptrap", "trigger", pokemon), geometry: "circle", style: "snaptrap",
                color: 0xCBD6C2, label: config && config.wide === true ? "广域捕兽夹" : "精准捕兽夹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["snaptrap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const wide = !!(config && config.wide);
            return {
                prepare: p("snaptrap", "tempo", context),
                recover: p("snaptrap", "recover", context),
                cooldown: p("snaptrap", "cooldown", context) + (wide ? 4 : 0),
                active: skills["snaptrap"].active,
                range: p("snaptrap", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("snaptrap:cock", snaptrapScene, 1, action.origin(),
                JSON.stringify({ moment: "cock", wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.5, p("snaptrap", "throwSpeed", action));
            const trigger = Math.max(0.7, p("snaptrap", "trigger", action));
            const wait = Math.max(80, Math.round(p("snaptrap", "waitTicks", action)));
            const arm = Math.max(4, Math.round(p("snaptrap", "armTicks", action)));
            const hold = Math.max(50, Math.round(p("snaptrap", "holdTicks", action)));
            const interval = Math.max(6, Math.round(p("snaptrap", "interval", action)));
            const escape = Math.max(1.0, p("snaptrap", "escape", action));
            const bite = p("snaptrap", "bite", action);
            const chew = p("snaptrap", "chew", action);
            const jaws = Math.max(8, Math.round(p("snaptrap", "jaws", action)));
            const scale = trigger / 1.1;
            let laid = false;

            function state(at: CombatPoint, armAt: number): any {
                return { point: [at.x(), at.y(), at.z()], trigger: trigger, armAt: armAt, bite: bite, chew: chew,
                    interval: interval, hold: hold, escape: escape, band: 1.6, jaws: jaws, sprung: false };
            }

            /** 抛出的夹子直接砸在活物身上：当场合上，不必等它踩。 */
            function strike(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                if (laid) return;
                laid = true;
                const scope = current.world();
                snaptrapApply(scope, target, at, state(at, scope.tick()));
                done(current);
            }

            /** 落到地面：撑开埋好，等人踩。 */
            function layAt(current: CombatAction, at: CombatPoint): void {
                if (laid) return;
                laid = true;
                const scope = current.world();
                scope.effect(snaptrapArmed, current.actor(), JSON.stringify(state(at, scope.tick() + arm)), wait + 40);
                WorldFeedback.emit(scope, snaptrapScene, 1, at,
                    { moment: "armed", trigger: trigger, jaws: jaws, wait: wait, scale: scale }, 26);
                WorldFeedback.keep(scope, "snaptrap:armed:" + String(current.id()), snaptrapScene, 1, at,
                    { moment: "armed_idle", trigger: trigger, jaws: jaws, wait: wait, scale: scale }, wait);
                sound(current, "minecraft:block.iron_trapdoor.open");
                done(current);
            }

            sound(action, "minecraft:block.chain.place");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.3, lifetime: 120,
                appearance: { item: "minecraft:iron_trapdoor", scale: 0.8 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), target = hit.target(), at = snaptrapGround(scope, hit.position());
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { strike(current, target, at); return; }
                    layAt(current, at);
                }
            }, function (current: CombatAction) { layAt(current, snaptrapGround(current.world(), current.targetPosition())); });
            WorldFeedback.emit(world, snaptrapScene, 1, action.origin(),
                { moment: "toss", projectile: flight, trigger: trigger, jaws: jaws, scale: scale }, 30);
        }
    });
}

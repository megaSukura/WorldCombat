/**
 * 祸不单行 / hex 的出手方式。
 *
 * 核心念头：把诅咒送到起手锁定的那一点，在那里画出一圈固定的结界，再从圈里一波接一波向上涌出鬼影尖刺；
 *   谁站在圈里谁挨刺，而**谁身上带着异常，谁那一下翻倍**——异常落在一个目标身上，诅咒就认得它。
 *   结界不追人：起手瞄哪就落哪，被选目标跑开也不会拖着它走。
 *
 * 两幕：
 *   起（coil，提交前）：施法者掐指凝咒、脚边符文微亮，同时把落点向下收到可承载地表并标出记号。这是对手走位的窗口。
 *   咒（cast → sigil → burst × waves / miss）：提交后一枚鬼火头沿真实投射路径飞向锁定的起手瞄点，沿途越过活体、
 *       碰墙就向下找最近的合法承载面；抵达处才铺开半径 `sigil` 的结界，并交给一个有限托管效果负责后续。
 *       托管效果按原 `waves`/`interval` 定时涌刺：每一波都重新判定真实几何内的敌人、按各自当时的异常结算 curse（带异常者翻倍），
 *       施法者不必等全部波结束；目标中途倒下也不影响已经到场的结界。落点没有可承载地表、或投射被墙截断又无处可落则散去。
 *
 * 与同族分开：群魔乱舞是飞出去追踪的鬼火、也吃异常，但它是「追着一队人打」；祸不单行是**留在原地的固定结界**，
 *   一波波向上涌刺，打的是站在圈里的人，离开圈就能躲开。唤醒巴掌只吃睡眠、命中即唤醒；欺诈读的是实际抓到者的物攻。
 */
namespace PokemonSkills {
    const hexLockKey = "world_combat:hex/aim";
    const hexSigilEffect = "world_combat:hex_sigil";

    /** 从一点向下找可承载地表（返回地表格中心）；找不到合法落面返回 null。 */
    function hexGround(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        const x = Math.floor(point.x()), y = Math.floor(point.y()), z = Math.floor(point.z());
        for (let dy = 1; dy >= -drop; dy--) {
            const block = world.block(WorldCombat.point(x, y + dy, z));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
            return WorldCombat.point(x + 0.5, y + dy + 1, z + 0.5);
        }
        return null;
    }

    function hexSigilData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3
            || !value.point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid hex sigil point");
        ["radius", "interval", "spike", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid hex sigil " + key);
        });
        if (typeof value.waves !== "number" || value.waves < 1 || value.waves % 1) throw new Error("Invalid hex sigil waves");
        value.wave = typeof value.wave === "number" && value.wave >= 0 && value.wave % 1 === 0 ? value.wave : 0;
        return JSON.stringify(value);
    }

    /** 到场的固定结界：按 waves/interval 定时结算，不受施法者动作是否结束影响。 */
    WorldCombat.effect(hexSigilEffect, 1, 400, "actor", hexSigilData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(hexSigilEffect, "start", function (effect) { effect.schedule("wave", "wave", 1, "{}"); });
    WorldCombat.effectHandler(hexSigilEffect, "wave", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (!(data.wave < data.waves)) { effect.end(); return; }
        data.wave++;
        effect.state(JSON.stringify(data));
        const centre = WorldCombat.point(data.point[0], data.point[1], data.point[2]);
        const owner = String(effect.source().ref());
        const region = WorldGeometry.ring(centre, 0, data.radius, { below: 1.6, above: 2.9 });
        // 带上 curse 段的 resolve：这一波按**这个目标自己**的事实重算咒力，翻倍按人落地。
        const perTarget = damageFeatures(hexId, "curse");
        WorldGeometry.selectEnemies(world, region, function (other, facts) {
            if (String(other.ref()) === owner) return;
            if (!world.clear(centre, facts.position())) return;
            const amount = p(hexId, "curse", withTarget(factContext(world), other));
            const blighted = hexAfflictedNow(world, other);
            if (!hurt(world, other, hexId, amount, { damage: damageSpec(hexId, "curse"), resolve: perTarget.resolve })) return;
            WorldFeedback.emit(world, hexScene, 1, facts.position(),
                { moment: "spike", target: String(other.ref()), scale: data.scale, spike: data.spike,
                    shards: Math.max(8, Math.round(10 + amount * 0.5)),
                    intensity: Math.max(0.6, Math.min(2.6, amount / 40)), blighted: blighted ? 1 : 0 }, 34);
            WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.0, 0)),
                blighted ? hexBlightText : hexStrikeText, [], 20);
        });
        WorldFeedback.emit(world, hexScene, 1, centre,
            { moment: "burst", radius: data.radius, scale: data.scale, spike: data.spike, wave: data.wave, waves: data.waves }, 30);
        world.sound("minecraft:entity.evoker_fangs.attack", centre, 16, "{}");
        if (data.wave < data.waves) effect.schedule("wave", "wave", data.interval, "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(hexSigilEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: hexId,
        cooldownParameter: "recharge",
        name: "Hex",
        description: "把诅咒送到起手锁定的那一点，画出一圈固定结界，然后一波接一波从圈里向上涌出鬼影尖刺。结界不追人；每个仍在圈里的敌人都会被刺中，谁身上带着任意异常（灼伤、麻痹、中毒／剧毒、冰冻、睡眠），谁那一下翻倍。",
        uses: ["在对手必经之地上预放一片诅咒结界", "对带异常者补刀", "一次钉住挤在圈里的一群人"],
        kind: "aim",
        range: 7.5,
        maxRange: 13.6,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "ghost",
        defaults: { chain: false, ai: { maxChase: 11, blighted: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(hexId, "sigil", pokemon) : 1.5, geometry: "area", style: "ghost", color: 0x8A6BE0, label: "祸不单行" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hexId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hexId, "coil", context)),
                recover: Math.round(p(hexId, "settle", context)),
                cooldown: Math.round(p(hexId, "recharge", context)),
                active: 0,
                range: p(hexId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense();
            const selected = action.targetPosition();
            const radius = p(hexId, "sigil", action);
            const scale = Math.max(0.6, Math.min(2.2, radius / 1.5));
            // 起手锁定落点：向下收到可承载地表；找不到就保留所选点，抵达时再判。
            const point = hexGround(world, selected, 4);
            const at = point !== null ? point : selected;
            action.data(hexLockKey, JSON.stringify({ found: point !== null, x: at.x(), y: at.y(), z: at.z() }));
            action.present("hex:coil", hexScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", chain: config && config.chain === true ? 1 : 0 }));
            action.present("hex:mark", hexScene, 1, at,
                JSON.stringify({ moment: "mark", radius: radius, scale: scale, found: point !== null ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const radius = Math.max(1.2, p(hexId, "sigil", action));
            const crawl = Math.max(0.4, p(hexId, "crawl", action));
            const waves = Math.max(2, Math.round(p(hexId, "waves", action)));
            const interval = Math.max(2, Math.round(p(hexId, "interval", action)));
            const spike = p(hexId, "spike", action);
            const chain = config && config.chain === true;
            const scale = Math.max(0.6, Math.min(2.2, radius / 1.5));
            const spikes = Math.max(6, Math.round(radius * radius * 9));
            const scenes = WorldFeedback.actionScenes(hexScene, 1);
            const stored = action.data(hexLockKey);
            let locked = action.targetPosition();
            if (stored !== null) {
                const value = JSON.parse(stored);
                if (typeof value.x === "number" && typeof value.y === "number" && typeof value.z === "number")
                    locked = WorldCombat.point(value.x, value.y, value.z);
            }
            const delta = locked.minus(origin);
            const distance = delta.length();
            const direction = distance < 0.05 ? action.direction() : delta.unit();
            const range = Math.max(1.0, distance);
            let settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            /** 抵达：在实际落点找承载面成结界；找不到就散去，绝不隔空瞬生。 */
            function arrive(current: CombatAction, raw: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                scenes.stop(current, "cast");
                const point = hexGround(scope, raw, 4);
                if (point === null) {
                    WorldFeedback.emit(scope, hexScene, 1, raw, { moment: "miss", scale: scale }, 30);
                    WorldFeedback.text(scope, raw.plus(WorldCombat.point(0, 0.9, 0)), hexMissText, [], 24);
                    sound(current, "cobblemon:impact.ghost");
                    finish(current);
                    return;
                }
                const ticks = waves * interval + 60;
                const id = scope.effect(hexSigilEffect, actor, JSON.stringify({ point: [point.x(), point.y(), point.z()],
                    radius: radius, waves: waves, interval: interval, spike: spike, scale: scale, wave: 0 }), ticks);
                if (id <= 0) { finish(current); return; }
                WorldFeedback.emit(scope, hexScene, 1, point,
                    { moment: "sigil", radius: radius, scale: scale, waves: waves, spikes: spikes, chain: chain ? 1 : 0 }, 40);
                WorldFeedback.onEffect(scope, id, "hex:sigil", hexScene, 1, point,
                    { moment: "hum", radius: radius, scale: scale, waves: waves, spikes: spikes, chain: chain ? 1 : 0 });
                sound(current, "minecraft:entity.evoker.cast_spell");
                finish(current);
            }

            sound(action, "cobblemon:move.shadowball.actor");
            const flight = LivingActions.projectile(action, {
                speed: crawl, range: range, radius: Math.max(0.25, radius * 0.3), gravity: 0,
                direction: direction,
                appearance: { sprite: "cobblemon:particle/generic/orb/energyorb", glow: true, tint: 0x8A6BE0, scale: 0.9, pierce: true },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    // 鬼火头越过活体，只在真实方块接触处落点。
                    if (hit.hitEntity()) return;
                    if (hit.blocked()) arrive(current, hit.position());
                }
            }, function (current: CombatAction) { arrive(current, locked); });
            scenes.show(action, "cast", origin, { moment: "cast", projectile: flight, scale: scale, waves: waves });
        }
    });
}

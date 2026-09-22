/**
 * 剑舞 / swordsdance 的出手方式。
 *
 * 核心念头：一段朝对手压上去的连斩。压低身形、拔刀起势，随后一步一斩地逼近，每一斩都在空气里留下刃光；
 * 定锋的一刻，脚步声与刀光一起落地，物攻大幅抬高。它是这一族里唯一会自己往前走的舞。
 *
 * 三幕：
 *   起势（windup，提交前）：拔刀、压低身形，刀光在脚边聚拢；可被打断，打断不消耗任何东西。
 *   连斩（提交后）：物攻一次抬起（原生 +2），并把这段锋芒挂成可见窗口；随后按 cuts 斩出，每斩沿最近的
 *     敌人前压 step/cuts 格（配置「进逼」时），发一道刃弧，并留下刃光。
 *   定锋（收势）：地面刃环按 arc 半径荡开，浮出结果；窗口走完时锋芒散去，这段舞抬起的物攻等级一并收回。
 *
 * 与同族分开：龙之舞螺旋上升、蝶舞原地扬鳞、胜利之舞踏步立冠；剑舞是**前压的连斩**，只抬物攻。
 */
namespace PokemonSkills {
    const swordsdanceScene = "world_combat:move_swordsdance";
    const swordsdanceHone = "world_combat:swordsdance_hone";
    const swordsdanceText = "world_combat.move.swordsdance.text.honed";
    const swordsdanceFadeText = "world_combat.move.swordsdance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际刃风半径 / 这个数`，让地面刃环与判定同半径。 */
    const swordsdanceArc = 1.4;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function swordsdanceStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function swordsdanceRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = swordsdanceStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, swordsdanceStage(world, actor, stat) - before);
    }
    /** 挂上/刷新「磨刃」窗口，amplifier 记录累计抬起的级数，供窗口结束时原样收回。 */
    function swordsdanceOpen(world: CombatWorld, actor: CombatActor, ticks: number, levels: number): void {
        if (levels <= 0) return;
        const existing = MobEffects.read(world, actor, swordsdanceHone);
        const total = Math.min(6, Math.max(0, existing === null ? 0 : existing.amplifier()) + levels);
        MobEffects.apply(world, actor, swordsdanceHone, ticks, total);
    }
    /** 最近的非友方活体方向（水平单位向量），用于「进逼」；没有就退回自身朝向。 */
    function swordsdanceTowards(world: CombatWorld, actor: CombatActor, fallback: CombatPoint): CombatPoint | null {
        const body = world.observe(actor);
        if (body === null) return null;
        const from = body.position();
        const actors = world.query(from, 14, false);
        let heading: CombatPoint | null = null, best = 15;
        for (let index = 0; index < actors.length; index++) {
            const facts = world.observe(actors[index]);
            if (facts === null || facts.friendly() || facts.health() <= 0) continue;
            const delta = facts.position().minus(from), horizontal = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
            if (horizontal < 0.05 || horizontal >= best) continue;
            best = horizontal; heading = WorldCombat.point(delta.x() / horizontal, 0, delta.z() / horizontal);
        }
        if (heading !== null) return heading;
        const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
        return flat.length() < 0.01 ? null : flat.unit();
    }

    define({
        id: "swordsdance",
        name: "剑舞",
        description: "激烈地跳起战舞提高气势。大幅提高自己的攻击。",
        uses: ["开战前把物攻拉满", "一边前压一边起舞，直接切进对手身边", "用可见的磨刃窗口逼对手拖时间"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "blade",
        stationary: true,
        defaults: { press: false, ai: { maxChase: 14, minGap: 3 } },
        fields: [flag("press", "进逼")],
        indicator: function (config, pokemon) {
            return { radius: p("swordsdance", "arc", pokemon), geometry: "area", style: "blade", color: 0xDCE8FF,
                label: config && config.press ? "剑舞 · 进逼" : "剑舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["swordsdance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("swordsdance", "tempo", context)),
                recover: Math.round(p("swordsdance", "aftercast", context)),
                cooldown: Math.round(p("swordsdance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_swordsdance:draw", swordsdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", press: config && config.press ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("swordsdance", "rise", action))));
            const cuts = Math.max(2, Math.min(5, Math.round(p("swordsdance", "cuts", action))));
            const beat = Math.max(3, Math.round(p("swordsdance", "beat", action)));
            const arc = Math.max(0.8, p("swordsdance", "arc", action));
            const stride = Math.max(0, p("swordsdance", "step", action)) / cuts;
            const sharpen = Math.max(8, Math.round(p("swordsdance", "sharpen", action)));
            const chips = Math.max(4, Math.round(sharpen / cuts));
            const window = Math.max(80, Math.round(p("swordsdance", "hone", action)));
            const press = !!(config && config.press);
            const scale = arc / swordsdanceArc;
            const levels = swordsdanceRaise(world, actor, "atk", rise);
            swordsdanceOpen(world, actor, window, levels);
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                scope.face(here.position().plus(current.direction()), 24, 24);
                WorldFeedback.emit(scope, swordsdanceScene, 1, here.position(),
                    { moment: "settle", arc: arc, scale: scale, cuts: cuts, sharpen: sharpen, levels: levels,
                        intensity: Math.max(0.6, Math.min(2.2, levels / 2 + sharpen / 48)) }, 30);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.3, 0)), swordsdanceText, [levels], 30);
                scope.sound("cobblemon:move.swordsdance.actor", here.position(), 18, "{}");
                finish(current);
            }
            function cutNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                if (press) {
                    const heading = swordsdanceTowards(scope, actor, current.direction());
                    if (heading !== null && stride > 0) scope.displace(actor, heading.scale(stride));
                }
                const now = scope.observe(actor);
                const at = now === null ? here.position() : now.position();
                scope.face(at.plus(current.direction()), 30, 30);
                WorldFeedback.emit(scope, swordsdanceScene, 1, at,
                    { moment: "cut", arc: arc, scale: scale, cuts: cuts, index: index + 1, chips: chips,
                        sharpen: sharpen, press: press ? 1 : 0, intensity: Math.max(0.6, Math.min(2.2, sharpen / 32)) }, 22);
                scope.sound(index === 0 ? "cobblemon:move.swordsdance.actor" : "minecraft:item.trident.hit", at, 14, "{}");
                index++;
                if (index >= cuts) { current.after(beat, settle); return; }
                current.after(beat, cutNow);
            }
            cutNow(action);
        }
    });

    // 磨刃窗口走完：把这段舞抬起的物攻等级原样收回（只收到当前实际持有的正等级，避免把别处的增益一起抹掉）。
    WorldCombat.on("world_combat:move_swordsdance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== swordsdanceHone) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, swordsdanceStage(world, actor, "atk")));
        if (loss > 0) NativeEffects.boost(world, actor, "atk", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, swordsdanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), swordsdanceFadeText, [], 24);
    });
}

/**
 * 生命水滴 / Life Dew —— 出手方式。
 *
 * 核心念头：脚下喷出一圈神奇的水，水环贴着地面向外铺开、扫过自己和身边的伙伴；被波峰扫到的一刻，
 *   伤口被水填上。水波走多远由它自己的劲道决定，扫过一遍就退去。
 *
 * 两幕：
 *   起（windup，提交前）：先在手心拢起一捧水（moment gather），只播预告；准备可被打断，不花代价。
 *   铺（execute，提交后）：水环从脚点开始按刻向外推，半径从 0 长到 radius；每推一格，圈内的自己与伙伴
 *     被扫到就回一次血（每个目标只回一次），同时续播 spread 的水环；走完整圈后 settle 收势。
 *
 * 与同族分开：花疗是撒向单个伙伴、在伤者脚下开花；治愈波动是一圈会被身体挡下的波。生命水滴是**自我为心、
 *   贴地铺开的水**，一边走一边把圈里的自己与伙伴一起救回来。与丛林治疗分开：水会走、只回血、不留地面；
 *   丛林是瞬间从地里长起、回血并解状态、还看脚下是什么地。
 */
namespace PokemonSkills {
    const lifedewScene = "world_combat:move_lifedew";
    const lifedewSweptText = "world_combat.move.lifedew.text.swept";
    /** 表现里的参考半径：`data.scale = 实际水波半径 / 这个数`。 */
    export const lifedewReferenceRadius = 3.0;

    /** 回复走共享治疗入口：宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命；返回世界单位回复量。 */
    function lifedewHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        const before = world.observe(target);
        if (before === null) return 0;
        const amount = Math.min(before.maxHealth() - before.health(), before.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            const pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        const after = world.observe(target);
        const gained = after === null ? 0 : Math.max(0, after.health() - before.health());
        if (gained > 0) feedback(world, target, after!.position(), "heal", { amount: Math.round(gained * 10) / 10 });
        return gained;
    }

    define({
        id: lifedewId,
        cooldownParameter: "wait", name: "生命水滴",
        description: "脚下喷出一圈神奇的水，水波贴地铺开、扫过自己和身边的伙伴，被扫到的一刻回复其最大生命的一成多；水波越铺越远，走完就退去。丰沛让水更足更宽，代价是铺得更慢、冷却更久。",
        uses: ["给围在身边的一队伙伴同时补一口", "接战前先放一发，把残血的人一起拉回来", "贴着伙伴放，顺路把他罩进水波"],
        kind: "self", range: 3, maxRange: 6, prepare: 8, active: 1, recover: 5, cooldown: 120, style: "water",
        maximumTicks: 220,
        defaults: { surge: false, helpFriends: true, ai: { healBelow: 0.82, maxChase: 12 } },
        fields: [flag("surge", "丰沛")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[lifedewId], detail: { values: config } };
            return { radius: p(lifedewId, "radius", context), geometry: "area", style: "water", color: 0x4FC3E8,
                label: config && config.surge === true ? "生命水滴 · 丰沛" : "生命水滴" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[lifedewId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p(lifedewId, "tempo", context))),
                recover: Math.max(3, Math.round(p(lifedewId, "aftercast", context))),
                cooldown: Math.round(p(lifedewId, "wait", context)),
                active: 1,
                range: p(lifedewId, "radius", context)
            };
        },
        /** 圈里至少有一个伤者才值得放这一发（自己也算）。 */
        ready: function (action) {
            const world = action.sense(), self = action.actor(), body = world.observe(self);
            if (body === null) return "no-body";
            const radius = Math.max(1.2, p(lifedewId, "radius", action));
            const actors = world.query(body.position(), radius + 0.6, false);
            for (let i = 0; i < actors.length; i++) {
                if (!world.friendly(actors[i])) continue;
                const view = world.observe(actors[i]);
                if (view !== null && view.health() < view.maxHealth() - 0.01) return "";
            }
            return "no-wounded";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lifedew:gather", lifedewScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", motes: Math.round(p(lifedewId, "motes", action)),
                    surge: config && config.surge === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const ground = WorldCombat.point(origin.x(), origin.y() - body.height() / 2 + 0.03, origin.z());
            const fraction = Math.max(0, Math.min(1, p(lifedewId, "heal", action)));
            const radius = Math.max(1.2, p(lifedewId, "radius", action));
            const spread = Math.max(4, Math.round(p(lifedewId, "spread", action)));
            const motes = Math.max(14, Math.round(p(lifedewId, "motes", action)));
            const surge = !!(config && config.surge);
            const baseScale = radius / lifedewReferenceRadius;
            const swept: { [ref: string]: boolean } = {};
            let count = 0, total = 0, settled = false;

            world.sound("cobblemon:move.waterpulse.actor", ground, 14, "{}");
            WorldFeedback.emit(world, lifedewScene, 1, ground,
                { moment: "burst", radius: radius, motes: motes, scale: baseScale, surge: surge ? 1 : 0 }, 22);

            function finish(): void {
                if (settled) return;
                settled = true;
                const here = world.observe(self);
                const point = here === null ? ground : WorldCombat.point(here.position().x(), here.position().y() - here.height() / 2 + 0.2, here.position().z());
                WorldFeedback.emit(world, lifedewScene, 1, ground,
                    { moment: "settle", radius: radius, motes: Math.round(motes * 0.5), scale: baseScale, healed: count }, 26);
                WorldFeedback.text(world, point, lifedewSweptText, [Math.round(total * 10) / 10], 28);
                done(action);
            }

            let elapsed = 0;
            function step(current: CombatAction): void {
                const scope = current.world();
                elapsed++;
                const ring = Math.max(0.3, radius * Math.min(1, elapsed / spread));
                const actors = scope.query(ground, ring, false);
                for (let i = 0; i < actors.length; i++) {
                    const other = actors[i], ref = String(other.ref());
                    if (swept[ref] || !scope.valid(other) || !scope.friendly(other)) continue;
                    swept[ref] = true;
                    const before = scope.observe(other);
                    if (before === null) continue;
                    const gained = lifedewHeal(scope, other, fraction, "lifedew");
                    if (gained <= 0) continue;
                    count++; total += gained;
                    const after = scope.observe(other);
                    const point = after === null ? before.position() : after.position();
                    const share = before.maxHealth() > 0 ? Math.max(0, Math.min(1, gained / before.maxHealth())) : 0;
                    scope.sound("minecraft:entity.generic.splash", point, 10, "{}");
                    WorldFeedback.emit(scope, lifedewScene, 1, point,
                        { moment: "splash", target: ref, gained: Math.round(gained * 10) / 10, share: share,
                            motes: Math.max(8, Math.round(motes * (0.5 + share / 2))), scale: baseScale }, 20);
                }
                WorldFeedback.keep(scope, "world_combat:move_lifedew/wave/" + String(self.ref()), lifedewScene, 1, ground,
                    { moment: "spread", radius: ring, motes: motes, scale: ring / lifedewReferenceRadius, progress: elapsed / spread }, 10);
                if (elapsed >= spread) { finish(); return; }
                current.after(1, step);
            }
            step(action);
        }
    });
}

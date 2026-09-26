/**
 * 吹飞 / whirlwind —— 注册与动作。
 *
 * 核心念头：朝选定方向推出一道向前推进的风墙——它从身前出发，一路扫到风道尽头。风墙是一道竖立的横风幕，
 *   按真实方块裁剪：同一侧向位置被墙挡住，风就到不了那里；开口处风继续通过。推进期间，真正在风道里、
 *   且被这一拍扫到的敌人沿风向被推走，累计不超过 blow 总预算；离开风面立即不再推动，抗位移的目标推不动，
 *   但风照常扫过。没有伤害，靠的是「赶走」，有合法后备的对手被真正换下。
 * 两幕：
 *   起（windup，提交前）：身前气流开始旋转、风尘贴地聚起，预告这道风。
 *   推（execute，提交后）：风墙从原点以每刻 front 格向前推进 beats 刻。每一拍先把每一条横向风线按方块裁剪
 *       （墙后的线停住，开口的线继续），再判定这一拍风面附近的非友方：侧向在风道内、位于当拍风面、且所在风线
 *       没有被墙截在身前的人，沿风向做受击位移（读到实际路程，抗位移只吃不推），累计到 blow 为止；首次接触的人
 *       被登记、计数并尝试原生 partyForceOut。幕随 `WorldFeedback.actionScenes` 每拍更新到实际风面。
 * 与同族分开：吹飞是本组唯一「线形、向前推进、会被墙截断」的逐退；吼叫绕身一圈，龙尾是真实摆尾的扇形横扫，巴投抓一个摔到背后。
 */

namespace PokemonSkills {
    define({
        id: whirlwindId,
        cooldownParameter: "wait",
        name: "吹飞",
        description: "朝选定方向推出一道向前推进的竖向风墙：风墙每刻扫过一拍，被真正扫到的敌人沿风向被推走（累计不超过吹飞总预算），有后备的对手会被真正换下。风遇墙即散，墙后的人不被吹；没有伤害，横移出风道或让地形挡住都能躲过。",
        uses: ["沿一条直线把一排敌人吹开", "把扑上来的敌人推回远处", "借墙与门口只让一部分风向通过"],
        kind: "point",
        range: 7,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 100,
        style: "wind",
        defaults: { wide: false, ai: { maxChase: 12, minFoes: 1, leaveStation: false } },
        fields: [flag("wide", "宽阔风墙")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[whirlwindId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(whirlwindId, "tempo", context)), recover: Math.round(p(whirlwindId, "recover", context)),
                cooldown: Math.round(p(whirlwindId, "wait", context)), active: 0, range: p(whirlwindId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_whirlwind:windup", whirlwindScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, motes: Math.round(p(whirlwindId, "motes", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(whirlwindId, "reach", pokemon), geometry: "line", style: "wind", color: 0xBFE4E8,
                label: config && config.wide ? "吹飞·宽阔风墙" : "吹飞" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const scenes = WorldFeedback.actionScenes(whirlwindScene, 1);
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            if (action.target() !== null) action.releaseTarget();
            let heading = action.targetPosition().minus(origin);
            const dir = WorldGeometry.flatUnit(heading, action.direction());
            const side = WorldCombat.point(-dir.z(), 0, dir.x());
            const reach = p(whirlwindId, "reach", action), band = p(whirlwindId, "band", action);
            const front = p(whirlwindId, "front", action), blow = p(whirlwindId, "blow", action);
            const motes = Math.round(p(whirlwindId, "motes", action));
            const beats = Math.max(1, Math.ceil(reach / front)), step = reach / beats;
            const scale = Math.max(0.6, Math.min(2.2, band / 1.7));
            const bodyHeight = body !== null ? body.height() : 1.4, bodyWidth = body !== null ? body.width() : 0.9;
            const baseY = origin.y() - bodyHeight / 2;
            const curtainHeight = Math.max(1.3, bodyHeight * 1.15);
            const columns = Math.max(3, Math.min(13, Math.round(band * 2 / 0.7) + 1));
            const frontAt: number[] = [], stopped: boolean[] = [];
            for (let i = 0; i < columns; i++) { frontAt.push(0); stopped.push(false); }
            const budget: { [ref: string]: number } = Object.create(null);
            const contacted: { [ref: string]: boolean } = Object.create(null);
            const reachDepth = Math.max(1.2, step * 2);
            let index = 0, hits = 0, settled = false;

            /** 第 i 条横向风线在距离 d 处的地面点（x/z 由 origin + side*offset + dir*d 给出）。 */
            function columnOffset(i: number): number { return -band + 2 * band * i / (columns - 1); }
            function linePoint(i: number, distance: number, y: number): number[] {
                const offset = columnOffset(i);
                return [origin.x() + side.x() * offset + dir.x() * distance, y, origin.z() + side.z() * offset + dir.z() * distance];
            }
            function nearestColumn(lateral: number): number {
                const raw = Math.round((lateral + band) / (2 * band) * (columns - 1));
                return Math.max(0, Math.min(columns - 1, raw));
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, function (next: CombatAction) {
                    const scope = next.world(), above = origin.plus(WorldCombat.point(0, 1.5, 0));
                    if (hits === 0) WorldFeedback.emit(scope, whirlwindScene, 1, origin.plus(dir.scale(reach)), { moment: "miss", scale: scale }, 16);
                    WorldFeedback.text(scope, above, hits > 0 ? whirlwindBlowText : whirlwindMissText, hits > 0 ? [hits] : [], 26);
                    sound(next, hits > 0 ? "cobblemon:move.gust.target" : "cobblemon:move.gust.actor");
                    done(next);
                });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const targetFront = Math.min(reach, (index + 1) * step), y0 = origin.y();
                // 每条横向风线按真实方块裁剪：被墙截住的线停住，开口的线继续推进。
                for (let i = 0; i < columns; i++) {
                    if (stopped[i] || frontAt[i] >= targetFront - 1e-6) continue;
                    const from = linePoint(i, frontAt[i], y0), to = linePoint(i, targetFront, y0);
                    const clip = scope.clipBlocks(WorldCombat.point(from[0], from[1], from[2]), WorldCombat.point(to[0], to[1], to[2]));
                    if (clip !== null && clip.blocked()) {
                        frontAt[i] += clip.position().minus(WorldCombat.point(from[0], from[1], from[2])).length();
                        stopped[i] = true;
                    } else frontAt[i] = targetFront;
                }
                // 风幕画在当拍的实际风面上：竖向沿每条风线的推进端点连成一条起伏的带子。
                const curtain: number[][] = [];
                for (let i = 0; i < columns; i++) curtain.push(linePoint(i, frontAt[i], baseY));
                for (let i = columns - 1; i >= 0; i--) curtain.push(linePoint(i, frontAt[i], baseY + curtainHeight));
                const frontCentre = origin.plus(dir.scale(targetFront));
                scenes.show(current, "front", frontCentre, {
                    moment: "gust", path: curtain, direction: [dir.x(), 0, dir.z()],
                    scale: scale, motes: motes, front: targetFront, reach: reach, band: band,
                    depth: Math.round(step * 100) / 100
                });
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(frontCentre, 0, band + 1, { below: 2.2, above: 2.6 }),
                    function (target, facts) {
                    const ref = String(target.ref());
                    if (ref === String(actor.ref())) return;
                    const point = facts.position();
                    const rel = point.minus(origin);
                    const along = rel.x() * dir.x() + rel.z() * dir.z();
                    const lateral = rel.x() * side.x() + rel.z() * side.z();
                    if (Math.abs(lateral) > band + 0.6) return;
                    if (Math.abs(along - targetFront) > reachDepth) return;
                    const column = nearestColumn(lateral);
                    if (frontAt[column] < along - 0.6) return;
                    if (!contacted[ref]) {
                        contacted[ref] = true;
                        budget[ref] = blow;
                        hits++;
                        WorldFeedback.emit(scope, whirlwindScene, 1, point, { moment: "swept", target: ref, motes: motes }, 22);
                        partyForceOut(scope, target, partyFeet(facts));
                    }
                    const remaining = budget[ref];
                    if (!(remaining > 0.05)) return;
                    const push = Math.min(remaining, blow * 0.4 + 0.05);
                    const applied = scope.hitDisplace(target, dir.scale(push));
                    budget[ref] = remaining - Math.max(0, applied);
                });
                index++;
                if (index >= beats) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "cobblemon:move.gust.actor");
            advance(action);
        }
    });
}

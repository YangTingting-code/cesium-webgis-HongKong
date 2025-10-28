
export function range(startIdx: number, endIdx: number): number[] {
  const indices: number[] = []
  for (let i = startIdx; i < endIdx; i++) {
    indices.push(i)
  }
  return indices
}



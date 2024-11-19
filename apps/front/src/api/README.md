## Query vs Mutation Guide

### Queries

Used for **reading** data from the server. Queries are:
- Cached by default
- Automatically refreshed
- Can be shared across components
- Typically GET operations
- Support background updates

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetchUsers()
})
```

### Mutations

Used for **modifying** data on the server. Mutations are:
- Never cached
- Must be triggered manually
- Instance is specific to component
- Typically POST, PUT, PATCH, DELETE operations
- Usually invalidate related queries after completion

```typescript
const { mutate, isPending } = useMutation({
  mutationFn: (newUser: User) => createUser(newUser),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }
})
```

### Key Differences

| Feature | Query | Mutation |
|---------|-------|----------|
| Purpose | Reading data | Writing data |
| Caching | Cached by default | Never cached |
| Execution | Can run automatically | Always manual |
| Sharing | Can be shared | Instance specific |
| Background Updates | Supported | Manual only |
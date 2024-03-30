

interface CategoryDTO {
   id: string;
   value: string;
}

interface CategoryInfoDTO {
    id: string;
    value: string;
    children: CategoryDTO;
}